import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import type {
  VideoMetadata,
  ProcessAudioPayload,
  ProcessAudioResult,
  CutProgress,
  DownloadMode,
  PlaylistEntry
} from '@sonata/shared-types';
import { BinaryManager } from './binaryManager';
import { SpotifyMetadataService } from './spotifyService';

function sanitizeName(name: string): string {
  return name.replace(/[\\/*?:"<>|]/g, '').trim();
}

export class LocalCutterService {
  private readonly spotifyService: SpotifyMetadataService;

  constructor(private readonly binaryManager: BinaryManager) {
    this.spotifyService = new SpotifyMetadataService();
  }

  private async fetchSpotifyMetadata(url: string): Promise<VideoMetadata> {
    return this.spotifyService.extractMetadata(url);
  }

  /**
   * Extração local de metadados para vídeos individuais ou playlists
   */
  public async fetchMetadata(url: string, mode?: DownloadMode): Promise<VideoMetadata> {
    const cleanUrl = url.trim().toLowerCase();
    if (cleanUrl.includes('spotify.com') || cleanUrl.includes('spotify.link') || cleanUrl.startsWith('spotify:')) {
      return this.fetchSpotifyMetadata(url);
    }

    const ytdlp = this.binaryManager.getYtDlpPath();
    const isPlaylistMode = mode === 'playlist' || url.includes('/playlist') || url.includes('list=');

    const args = isPlaylistMode
      ? ['--dump-single-json', '--flat-playlist', '--skip-download', '--no-warnings', '--ignore-errors', url]
      : ['--dump-json', '--skip-download', '--no-warnings', '--no-playlist', '--ignore-errors', url];

    return new Promise((resolve, reject) => {
      const proc = spawn(ytdlp, args);
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => (stdout += data.toString()));
      proc.stderr.on('data', (data) => (stderr += data.toString()));

      proc.on('error', (err) => {
        reject(new Error(`Falha ao executar yt-dlp: ${err.message}`));
      });

      proc.on('close', (code) => {
        if (stdout.trim()) {
          try {
            const info = JSON.parse(stdout);

            if (info._type === 'playlist' || Array.isArray(info.entries)) {
              const rawEntries = Array.isArray(info.entries) ? info.entries : [];
              const playlistEntries: PlaylistEntry[] = rawEntries
                .filter((e: any) => {
                  if (!e) return false;
                  if (!e.id && !e.url) return false;
                  if (e.title === '[Deleted video]' || e.title === '[Private video]') return false;
                  return true;
                })
                .map((e: any) => {
                  const entryId = e.id || '';
                  const entryUrl = e.url || (entryId ? `https://www.youtube.com/watch?v=${entryId}` : '');
                  const thumb = (e.thumbnails && e.thumbnails[0]?.url) || '';
                  return {
                    id: entryId,
                    title: e.title || 'Música Sem Título',
                    author: e.uploader || e.channel || info.uploader || 'Artista Desconhecido',
                    durationSeconds: Math.floor(e.duration || 0),
                    url: entryUrl,
                    thumbnailUrl: thumb
                  };
                });

              if (playlistEntries.length === 0 && code !== 0) {
                reject(new Error(`Nenhum vídeo disponível encontrado na playlist: ${stderr}`));
                return;
              }

              const coverThumb =
                (info.thumbnails && info.thumbnails[0]?.url) ||
                playlistEntries[0]?.thumbnailUrl ||
                '';

              resolve({
                id: info.id || 'playlist',
                title: info.title || 'Playlist do YouTube',
                author: info.uploader || info.channel || 'Vários Artistas',
                durationSeconds: playlistEntries.reduce((acc, curr) => acc + curr.durationSeconds, 0),
                thumbnailUrl: coverThumb,
                rawDescription: info.description || '',
                isPlaylist: true,
                playlistEntries
              });
              return;
            }

            resolve({
              id: info.id || '',
              title: info.title || 'Áudio Sem Título',
              author: info.uploader || info.channel || 'Artista Desconhecido',
              durationSeconds: Math.floor(info.duration || 0),
              thumbnailUrl: info.thumbnail || '',
              rawDescription: info.description || '',
              isPlaylist: false
            });
            return;
          } catch (e) {
          }
        }

        if (code !== 0) {
          reject(new Error(`yt-dlp falhou com código ${code}: ${stderr}`));
        } else {
          reject(new Error('Falha ao interpretar metadados do vídeo ou playlist.'));
        }
      });
    });
  }

  /**
   * Pipeline de processamento de áudio local
   */
  public async processAudio(
    payload: ProcessAudioPayload,
    onProgress: (progress: CutProgress) => void
  ): Promise<ProcessAudioResult> {
    const mode = payload.mode || 'album';

    if (mode === 'single') {
      return this.processSingleTrack(payload, onProgress);
    } else if (mode === 'playlist') {
      return this.processPlaylist(payload, onProgress);
    } else {
      return this.processAlbumSlicing(payload, onProgress);
    }
  }

  private async processSingleTrack(
    payload: ProcessAudioPayload,
    onProgress: (progress: CutProgress) => void
  ): Promise<ProcessAudioResult> {
    const workDir = path.join(os.tmpdir(), `sonata-single-${Date.now()}`);
    fs.mkdirSync(workDir, { recursive: true });

    const rawAudioPath = path.join(workDir, 'source.m4a');
    const ytdlp = this.binaryManager.getYtDlpPath();
    const ffmpeg = this.binaryManager.getFfmpegPath();

    onProgress({
      status: 'downloading',
      percentage: 20,
      message: 'Baixando áudio...'
    });

    const track = payload.tracks[0] || {
      id: '1',
      index: 1,
      title: payload.albumTitle || 'Música',
      artist: payload.artist || '',
      selected: true
    };

    let downloadUrl = payload.videoUrl;
    if (downloadUrl.includes('spotify.com') || !downloadUrl.startsWith('http')) {
      const searchArtist = track.artist || payload.artist || '';
      const query = `${searchArtist ? searchArtist + ' - ' : ''}${track.title}`.trim();
      downloadUrl = `ytsearch1:${query}`;
    }

    await this.downloadRawAudio(ytdlp, ffmpeg, downloadUrl, rawAudioPath);

    onProgress({
      status: 'tagging',
      percentage: 70,
      message: 'Processando e salvando arquivo...'
    });

    const baseDir = payload.destinationDirectory && payload.destinationDirectory.trim()
      ? payload.destinationDirectory.trim()
      : path.join(os.homedir(), 'Downloads', 'Sonata');
    fs.mkdirSync(baseDir, { recursive: true });

    const safeTitle = sanitizeName(track.title) || 'Musica';
    const safeArtist = track.artist ? sanitizeName(track.artist) : '';
    const fileName = safeArtist ? `${safeArtist} - ${safeTitle}.${payload.outputFormat}` : `${safeTitle}.${payload.outputFormat}`;
    const outFile = path.join(baseDir, fileName);

    const ffmpegArgs = ['-y', '-i', rawAudioPath];
    if (payload.outputFormat === 'mp3') {
      ffmpegArgs.push(
        '-c:a', 'libmp3lame',
        '-b:a', payload.bitrate || '320k',
        '-metadata', `title=${track.title}`
      );
      if (track.artist) {
        ffmpegArgs.push('-metadata', `artist=${track.artist}`);
      }
    } else {
      ffmpegArgs.push('-c:a', 'copy');
    }
    ffmpegArgs.push(outFile);

    await this.runFfmpeg(ffmpeg, ffmpegArgs, track.title);

    fs.rmSync(workDir, { recursive: true, force: true });

    onProgress({
      status: 'completed',
      percentage: 100,
      message: 'Música baixada e salva com sucesso!'
    });

    return {
      jobId: `single-${Date.now()}`,
      outputDirectory: baseDir,
      tracksProcessed: 1
    };
  }

  private async processAlbumSlicing(
    payload: ProcessAudioPayload,
    onProgress: (progress: CutProgress) => void
  ): Promise<ProcessAudioResult> {
    const workDir = path.join(os.tmpdir(), `sonata-album-${Date.now()}`);
    fs.mkdirSync(workDir, { recursive: true });

    const rawAudioPath = path.join(workDir, 'source.m4a');
    const ytdlp = this.binaryManager.getYtDlpPath();
    const ffmpeg = this.binaryManager.getFfmpegPath();

    onProgress({
      status: 'downloading',
      percentage: 15,
      message: 'Baixando áudio do álbum...'
    });

    await this.downloadRawAudio(ytdlp, ffmpeg, payload.videoUrl, rawAudioPath);

    const selectedTracks = payload.tracks.filter((t) => t.selected);
    const total = selectedTracks.length;

    const homeDir = os.homedir();
    const folderName = payload.albumTitle ? sanitizeName(payload.albumTitle) : `Album_${Date.now()}`;
    const outputDir = payload.destinationDirectory && payload.destinationDirectory.trim()
      ? path.join(payload.destinationDirectory.trim(), folderName)
      : path.join(homeDir, 'Downloads', 'Sonata', folderName);
    fs.mkdirSync(outputDir, { recursive: true });

    for (let i = 0; i < total; i++) {
      const track = selectedTracks[i];
      const safeTitle = sanitizeName(track.title) || `Faixa_${track.index}`;
      const outFile = path.join(outputDir, `${track.index.toString().padStart(2, '0')} - ${safeTitle}.${payload.outputFormat}`);

      const percent = 20 + Math.floor(((i + 1) / total) * 75);
      onProgress({
        status: 'slicing',
        percentage: percent,
        currentTrackIndex: i + 1,
        totalTracks: total,
        message: `Cortando faixa ${i + 1} de ${total}: "${track.title}"`
      });

      const args = ['-y'];
      if (track.startSeconds !== undefined) {
        args.push('-ss', track.startSeconds.toString());
      }
      args.push('-i', rawAudioPath);

      if (track.startSeconds !== undefined && track.endSeconds && track.endSeconds > track.startSeconds) {
        args.push('-t', (track.endSeconds - track.startSeconds).toString());
      }

      if (payload.outputFormat === 'mp3') {
        args.push(
          '-c:a', 'libmp3lame',
          '-b:a', payload.bitrate || '320k',
          '-metadata', `title=${track.title}`,
          '-metadata', `track=${track.index}/${total}`
        );
        if (track.artist || payload.artist) {
          args.push('-metadata', `artist=${track.artist || payload.artist}`);
        }
        if (payload.albumTitle) {
          args.push('-metadata', `album=${payload.albumTitle}`);
        }
      } else {
        args.push('-c:a', 'copy');
      }

      args.push(outFile);

      await this.runFfmpeg(ffmpeg, args, track.title);
    }

    fs.rmSync(workDir, { recursive: true, force: true });

    onProgress({
      status: 'completed',
      percentage: 100,
      message: 'Todas as faixas foram cortadas e salvas com sucesso!'
    });

    return {
      jobId: `album-${Date.now()}`,
      outputDirectory: outputDir,
      tracksProcessed: total
    };
  }

  private async processPlaylist(
    payload: ProcessAudioPayload,
    onProgress: (progress: CutProgress) => void
  ): Promise<ProcessAudioResult> {
    const ytdlp = this.binaryManager.getYtDlpPath();
    const ffmpeg = this.binaryManager.getFfmpegPath();

    const selectedTracks = payload.tracks.filter((t) => t.selected);
    const total = selectedTracks.length;
    const skippedTracks: Array<{ title: string; reason: string }> = [];

    const homeDir = os.homedir();
    const folderName = payload.albumTitle ? sanitizeName(payload.albumTitle) : `Playlist_${Date.now()}`;
    const outputDir = payload.destinationDirectory && payload.destinationDirectory.trim()
      ? path.join(payload.destinationDirectory.trim(), folderName)
      : path.join(homeDir, 'Downloads', 'Sonata', folderName);
    fs.mkdirSync(outputDir, { recursive: true });

    for (let i = 0; i < total; i++) {
      const track = selectedTracks[i];
      let targetUrl = track.videoUrl;
      if (!targetUrl) {
        if (track.id && !track.id.startsWith('spotify-')) {
          targetUrl = `https://www.youtube.com/watch?v=${track.id}`;
        } else {
          targetUrl = payload.videoUrl;
        }
      }
      if (targetUrl.includes('spotify.com')) {
        const query = `${track.artist ? track.artist + ' - ' : ''}${track.title}`.trim();
        targetUrl = `ytsearch1:${query}`;
      }

      const percent = Math.floor(((i + 1) / total) * 100);
      onProgress({
        status: 'downloading',
        percentage: percent,
        currentTrackIndex: i + 1,
        totalTracks: total,
        message: `Baixando faixa ${i + 1} de ${total}: "${track.title}"`
      });

      const workDir = path.join(os.tmpdir(), `sonata-pl-${Date.now()}-${i}`);
      fs.mkdirSync(workDir, { recursive: true });
      const rawAudioPath = path.join(workDir, 'source.m4a');

      try {
        await this.downloadRawAudio(ytdlp, ffmpeg, targetUrl, rawAudioPath);

        const safeTitle = sanitizeName(track.title) || `Faixa_${track.index}`;
        const outFile = path.join(
          outputDir,
          `${track.index.toString().padStart(2, '0')} - ${safeTitle}.${payload.outputFormat}`
        );

        const ffmpegArgs = ['-y', '-i', rawAudioPath];
        if (payload.outputFormat === 'mp3') {
          ffmpegArgs.push(
            '-c:a', 'libmp3lame',
            '-b:a', payload.bitrate || '320k',
            '-metadata', `title=${track.title}`,
            '-metadata', `track=${track.index}/${total}`
          );
          if (track.artist || payload.artist) {
            ffmpegArgs.push('-metadata', `artist=${track.artist || payload.artist}`);
          }
          if (payload.albumTitle) {
            ffmpegArgs.push('-metadata', `album=${payload.albumTitle}`);
          }
        } else {
          ffmpegArgs.push('-c:a', 'copy');
        }
        ffmpegArgs.push(outFile);

        await this.runFfmpeg(ffmpeg, ffmpegArgs, track.title);
      } catch (trackErr: any) {
        const reason = trackErr.message?.includes('Video unavailable')
          ? 'Vídeo não disponível no YouTube'
          : 'Indisponível para download';
        skippedTracks.push({ title: track.title, reason });
        console.warn(`[Sonata] Faixa ignorada: "${track.title}" (${reason})`);
      } finally {
        fs.rmSync(workDir, { recursive: true, force: true });
      }
    }

    const successfulCount = total - skippedTracks.length;
    const finalMessage = skippedTracks.length > 0
      ? `Download finalizado: ${successfulCount} músicas salvas (${skippedTracks.length} indisponíveis ignoradas).`
      : 'Todas as músicas da playlist foram baixadas com sucesso!';

    onProgress({
      status: 'completed',
      percentage: 100,
      message: finalMessage
    });

    return {
      jobId: `playlist-${Date.now()}`,
      outputDirectory: outputDir,
      tracksProcessed: successfulCount,
      skippedTracks
    };
  }

  private async downloadRawAudio(ytdlp: string, ffmpeg: string, url: string, outputPath: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const ytdlpArgs = [
        '-f', 'ba/b',
        '-o', outputPath,
        '--no-playlist',
        '--ffmpeg-location', path.dirname(ffmpeg),
        url
      ];

      const proc = spawn(ytdlp, ytdlpArgs);
      let stderr = '';

      proc.stderr?.on('data', (d) => (stderr += d.toString()));
      proc.on('error', (err) => {
        reject(new Error(`Falha ao executar yt-dlp: ${err.message}`));
      });

      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Falha no download local com código ${code}: ${stderr}`));
      });
    });
  }

  private async runFfmpeg(ffmpeg: string, args: string[], trackName: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const proc = spawn(ffmpeg, args);
      let ffmpegStderr = '';

      proc.stderr?.on('data', (d) => (ffmpegStderr += d.toString()));
      proc.on('error', (err) => {
        reject(new Error(`Falha ao executar FFmpeg: ${err.message}`));
      });
      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Erro no processamento FFmpeg para "${trackName}" (código ${code}): ${ffmpegStderr}`));
      });
    });
  }
}
