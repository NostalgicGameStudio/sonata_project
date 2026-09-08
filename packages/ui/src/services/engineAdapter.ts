import type {
  VideoMetadata,
  Track,
  ProcessAudioPayload,
  ProcessAudioResult,
  CutProgress
} from '@sonata/shared-types';

/**
 * Interface de abstração da Engine de processamento (Princípio da Segregação de Interfaces e Inversão de Dependência)
 */
export interface ICutterEngine {
  readonly isDesktop: boolean;
  fetchMetadata(url: string): Promise<VideoMetadata>;
  parseTimestamps(text: string, durationSeconds?: number): Promise<Track[]>;
  selectDirectory?(): Promise<string | null>;
  processAudio(
    payload: ProcessAudioPayload,
    onProgress: (progress: CutProgress) => void
  ): Promise<ProcessAudioResult>;
}

/**
 * Implementação Desktop: 100% Local e Offline via IPC do Electron
 */
export class DesktopLocalEngine implements ICutterEngine {
  readonly isDesktop = true;

  private get api() {
    const electronApi = (window as unknown as { electronAPI?: Record<string, unknown> }).electronAPI;
    if (!electronApi) {
      throw new Error('Ambiente Electron não detectado no DesktopLocalEngine.');
    }
    return electronApi as {
      fetchMetadata: (url: string) => Promise<VideoMetadata>;
      selectDirectory: () => Promise<string | null>;
      parseTimestamps: (text: string, durationSeconds?: number) => Promise<Track[]>;
      processAudio: (payload: ProcessAudioPayload) => Promise<ProcessAudioResult>;
      onProgress: (callback: (progress: CutProgress) => void) => () => void;
    };
  }

  async fetchMetadata(url: string): Promise<VideoMetadata> {
    return this.api.fetchMetadata(url);
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
 * Implementação Web: Consome a API assíncrona do Django Ninja
 */
export class WebApiEngine implements ICutterEngine {
  readonly isDesktop = false;
  private readonly baseUrl: string;

  constructor(baseUrl: string = '/api/v1') {
    this.baseUrl = baseUrl;
  }

  async selectDirectory(): Promise<string | null> {
    // Na Web, o navegador gerencia o download de arquivos via browser default
    return null;
  }

  async fetchMetadata(url: string): Promise<VideoMetadata> {
    const response = await fetch(`${this.baseUrl}/metadata`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Falha ao buscar metadados do vídeo.');
    }

    return response.json();
  }

  async parseTimestamps(text: string, durationSeconds?: number): Promise<Track[]> {
    const response = await fetch(`${this.baseUrl}/parse-timestamps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, duration_seconds: durationSeconds })
    });

    if (!response.ok) {
      throw new Error('Falha ao processar marcações de tempo.');
    }

    return response.json();
  }

  async processAudio(
    payload: ProcessAudioPayload,
    onProgress: (progress: CutProgress) => void
  ): Promise<ProcessAudioResult> {
    onProgress({ status: 'downloading', percentage: 15, message: 'Iniciando requisição ao servidor...' });

    const response = await fetch(`${this.baseUrl}/cut`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Falha ao fatiar o áudio na API.');
    }

    onProgress({ status: 'completed', percentage: 100, message: 'Processamento concluído!' });
    return response.json();
  }
}

/**
 * Factory para instanciar a Engine correta baseada no ambiente de execução
 */
export function createCutterEngine(): ICutterEngine {
  const isElectron = typeof window !== 'undefined' && 'electronAPI' in window;
  return isElectron ? new DesktopLocalEngine() : new WebApiEngine();
}
