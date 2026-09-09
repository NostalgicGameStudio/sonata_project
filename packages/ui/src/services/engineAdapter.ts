import type {
  VideoMetadata,
  Track,
  ProcessAudioPayload,
  ProcessAudioResult,
  CutProgress,
  DownloadMode
} from '@sonata/shared-types';

/**
 * Interface de abstração da Engine de processamento
 */
export interface ICutterEngine {
  readonly isDesktop: boolean;
  fetchMetadata(url: string, mode?: DownloadMode): Promise<VideoMetadata>;
  parseTimestamps(text: string, durationSeconds?: number): Promise<Track[]>;
  selectDirectory?(): Promise<string | null>;
  processAudio(
    payload: ProcessAudioPayload,
    onProgress: (progress: CutProgress) => void
  ): Promise<ProcessAudioResult>;
}

/**
 * Implementação Desktop: Local via IPC do Electron
 */
export class DesktopLocalEngine implements ICutterEngine {
  readonly isDesktop = true;

  private get api() {
    const electronApi = (window as unknown as { electronAPI?: Record<string, unknown> }).electronAPI;
    if (!electronApi) {
      throw new Error('Ambiente Electron não detectado no DesktopLocalEngine.');
    }
    return electronApi as {
      fetchMetadata: (url: string, mode?: DownloadMode) => Promise<VideoMetadata>;
      selectDirectory: () => Promise<string | null>;
      parseTimestamps: (text: string, durationSeconds?: number) => Promise<Track[]>;
      processAudio: (payload: ProcessAudioPayload) => Promise<ProcessAudioResult>;
      onProgress: (callback: (progress: CutProgress) => void) => () => void;
    };
  }

  async fetchMetadata(url: string, mode?: DownloadMode): Promise<VideoMetadata> {
    return this.api.fetchMetadata(url, mode);
  }

  async selectDirectory(): Promise<string | null> {
    return this.api.selectDirectory();
  }

  async parseTimestamps(text: string, durationSeconds?: number): Promise<Track[]> {
    return this.api.parseTimestamps(text, durationSeconds);
  }

  async processAudio(
    payload: ProcessAudioPayload,
    onProgress: (progress: CutProgress) => void
  ): Promise<ProcessAudioResult> {
    const unsubscribe = this.api.onProgress(onProgress);
    try {
      const cleanPayload: ProcessAudioPayload = JSON.parse(JSON.stringify(payload));
      return await this.api.processAudio(cleanPayload);
    } finally {
      unsubscribe();
    }
  }
}

/**
 * Implementação Web: Consome a API REST assíncrona
 */
export class WebApiEngine implements ICutterEngine {
  readonly isDesktop = false;
  private readonly baseUrl: string;

  constructor(baseUrl: string = '/api/v1') {
    this.baseUrl = baseUrl;
  }

  async selectDirectory(): Promise<string | null> {
    return null;
  }

  async fetchMetadata(url: string, mode?: DownloadMode): Promise<VideoMetadata> {
    const response = await fetch(`${this.baseUrl}/metadata`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, mode })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || err.detail || 'Falha ao buscar metadados do vídeo.');
    }

    const data = await response.json();
    return {
      id: data.id,
      title: data.title,
      author: data.author,
      durationSeconds: data.duration_seconds || 0,
      thumbnailUrl: data.thumbnail_url || '',
      rawDescription: data.raw_description || '',
      isPlaylist: data.is_playlist || false,
      playlistEntries: (data.playlist_entries || []).map((p: any) => ({
        id: p.id,
        title: p.title,
        author: p.author,
        durationSeconds: p.duration_seconds || 0,
        url: p.url,
        thumbnailUrl: p.thumbnail_url
      }))
    };
  }

  async parseTimestamps(text: string, durationSeconds?: number): Promise<Track[]> {
    const response = await fetch(`${this.baseUrl}/parse-timestamps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, duration_seconds: durationSeconds })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || err.detail || 'Falha ao processar marcações de tempo.');
    }

    const data = await response.json();
    return data.map((t: any) => ({
      id: `track-${t.index}`,
      index: t.index,
      title: t.title,
      startTime: t.start_time,
      startSeconds: t.start_seconds,
      endTime: t.end_time,
      endSeconds: t.end_seconds,
      durationSeconds: t.duration_seconds,
      artist: t.artist,
      selected: t.selected !== false,
      videoUrl: t.video_url
    }));
  }

  async processAudio(
    payload: ProcessAudioPayload,
    onProgress: (progress: CutProgress) => void
  ): Promise<ProcessAudioResult> {
    onProgress({ status: 'downloading', percentage: 15, message: 'Processando áudio...' });

    const apiPayload = {
      mode: payload.mode || 'album',
      video_url: payload.videoUrl,
      output_format: payload.outputFormat || 'mp3',
      bitrate: payload.bitrate || '320k',
      album_title: payload.albumTitle,
      artist: payload.artist,
      tracks: payload.tracks.map(t => ({
        index: t.index,
        title: t.title,
        start_time: t.startTime || '00:00',
        start_seconds: t.startSeconds || 0,
        end_time: t.endTime || null,
        end_seconds: t.endSeconds || null,
        duration_seconds: t.durationSeconds || null,
        artist: t.artist || null,
        selected: t.selected !== false,
        video_url: t.videoUrl || null
      }))
    };

    const response = await fetch(`${this.baseUrl}/cut`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiPayload)
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const msg = typeof err.detail === 'string' ? err.detail : err.message || 'Falha ao processar o áudio.';
      throw new Error(msg);
    }

    const data = await response.json();
    onProgress({ status: 'completed', percentage: 100, message: 'Download concluído!' });

    if (data.download_url && typeof window !== 'undefined' && document) {
      const downloadLink = document.createElement('a');
      downloadLink.href = data.download_url;
      downloadLink.setAttribute('download', '');
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }

    return {
      jobId: data.job_id,
      tracksProcessed: data.tracks_processed || data.tracks_count || payload.tracks.filter(t => t.selected).length,
      downloadUrl: data.download_url
    };
  }
}

/**
 * Factory para instanciar a Engine correta baseada no ambiente de execução
 */
export function createCutterEngine(): ICutterEngine {
  const isElectron = typeof window !== 'undefined' && 'electronAPI' in window;
  return isElectron ? new DesktopLocalEngine() : new WebApiEngine();
}
