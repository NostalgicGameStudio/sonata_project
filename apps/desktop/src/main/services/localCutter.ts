import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import type { VideoMetadata, ProcessAudioPayload, ProcessAudioResult, CutProgress, Track } from '@sonata/shared-types';
import { BinaryManager } from './binaryManager';

export class LocalCutterService {
  constructor(private readonly binaryManager: BinaryManager) {}

  /**
   * Extração local de metadados sem chamadas a servidores de terceiros
   */
  public async fetchMetadata(url: string): Promise<VideoMetadata> {
    const ytdlp = this.binaryManager.getYtDlpPath();

    return new Promise((resolve, reject) => {
      const proc = spawn(ytdlp, ['--dump-json', '--skip-download', '--no-warnings', url]);
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => (stdout += data.toString()));
      proc.stderr.on('data', (data) => (stderr += data.toString()));

      proc.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`yt-dlp falhou com código ${code}: ${stderr}`));
          return;
        }

        try {
          const info = JSON.parse(stdout);
          resolve({
            id: info.id || '',
            title: info.title || 'Áudio Sem Título',
            author: info.uploader || info.channel || 'Artista Desconhecido',
            durationSeconds: Math.floor(info.duration || 0),
            thumbnailUrl: info.thumbnail || '',
            rawDescription: info.description || ''
          });
        } catch (e) {
          reject(new Error('Falha ao interpretar metadados do vídeo.'));
        }
      });
    });
  }

  /**
   * Pipeline de processamento 100% local: Download do stream de áudio e fatiamento via FFmpeg
   */
  public async processAudio(
    payload: ProcessAudioPayload,
    onProgress: (progress: CutProgress) => void
  ): Promise<ProcessAudioResult> {
    const workDir = path.join(os.tmpdir(), `sonata-${Date.now()}`);
    fs.mkdirSync(workDir, { recursive: true });

    const rawAudioPath = path.join(workDir, 'source.m4a');
    const ytdlp = this.binaryManager.getYtDlpPath();
    const ffmpeg = this.binaryManager.getFfmpegPath();

    onProgress({
      status: 'downloading',
      percentage: 15,
      message: 'Baixando áudio em alta definição...'
    });

    // 1. Download do áudio via yt-dlp local
    await new Promise<void>((resolve, reject) => {
      const proc = spawn(ytdlp, [
        '-f', 'ba/b',
        '-o', rawAudioPath,
        '--no-playlist',
        payload.videoUrl
      ]);

      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Falha no download local com código ${code}`));
      });
    });

    const selectedTracks = payload.tracks.filter((t) => t.selected);
    const total = selectedTracks.length;

    // Destino final: pasta Downloads do usuário
    const homeDir = os.homedir();
    const outputDir = path.join(homeDir, 'Downloads', 'Sonata', `Album_${Date.now()}`);
    fs.mkdirSync(outputDir, { recursive: true });

    // 2. Fatiamento de cada faixa via FFmpeg local
    for (let i = 0; i < total; i++) {
      const track = selectedTracks[i];
      const safeTitle = track.title.replace(/[\\/*?:"<>|]/g, '').trim() || `Faixa_${track.index}`;
      const outFile = path.join(outputDir, `${track.index.toString().padStart(2, '0')} - ${safeTitle}.${payload.outputFormat}`);

      const percent = 20 + Math.floor(((i + 1) / total) * 75);
      onProgress({
        status: 'slicing',
        percentage: percent,
        currentTrackIndex: i + 1,
        totalTracks: total,
        message: `Fatiando faixa ${i + 1} de ${total}: "${track.title}"`
      });

      const args = ['-y', '-ss', track.startSeconds.toString(), '-i', rawAudioPath];

      if (track.endSeconds && track.endSeconds > track.startSeconds) {
        args.push('-t', (track.endSeconds - track.startSeconds).toString());
      }

      if (payload.outputFormat === 'mp3') {
        args.push(
          '-c:a', 'libmp3lame',
          '-b:a', payload.bitrate || '320k',
          '-metadata', `title=${track.title}`,
          '-metadata', `track=${track.index}/${total}`
        );
      } else {
        args.push('-c:a', 'copy');
      }

      args.push(outFile);

      await new Promise<void>((resolve, reject) => {
        const proc = spawn(ffmpeg, args);
        proc.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`Erro no corte FFmpeg para "${track.title}"`));
        });
      });
    }

    // Limpeza de temporários
    fs.rmSync(workDir, { recursive: true, force: true });

    onProgress({
      status: 'completed',
      percentage: 100,
      message: 'Todas as faixas foram fatiadas com sucesso!'
    });

    return {
      jobId: `local-${Date.now()}`,
      outputDirectory: outputDir,
      tracksProcessed: total
    };
  }
}
