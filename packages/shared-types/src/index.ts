/**
 * Metadados essenciais de um vídeo do YouTube
 */
export interface VideoMetadata {
  id: string;
  title: string;
  author: string;
  durationSeconds: number;
  thumbnailUrl: string;
  rawDescription: string;
}

/**
 * Representação de uma faixa musical fatiada
 */
export interface Track {
  id: string;
  index: number;
  title: string;
  artist?: string;
  startTime: string;      // Formato "MM:SS" ou "HH:MM:SS"
  startSeconds: number;
  endTime?: string;       // Formato "MM:SS" ou "HH:MM:SS"
  endSeconds?: number;
  selected: boolean;      // Para permitir ao usuário marcar/desmarcar faixas para download
}

/**
 * Status do processo de corte
 */
export type CutterStatus = 'idle' | 'downloading' | 'slicing' | 'tagging' | 'completed' | 'error';

/**
 * Progresso de execução do job
 */
export interface CutProgress {
  status: CutterStatus;
  percentage: number;
  currentTrackIndex?: number;
  totalTracks?: number;
  message?: string;
}

/**
 * Payload para iniciar o processamento de áudio
 */
export interface ProcessAudioPayload {
  videoUrl: string;
  tracks: Track[];
  outputFormat: 'mp3' | 'flac' | 'wav' | 'aac';
  bitrate?: string; // ex: "320k", "192k"
  includeMetadataTags?: boolean;
}

/**
 * Resultado do processamento
 */
export interface ProcessAudioResult {
  jobId: string;
  downloadUrl?: string; // Para Web
  outputDirectory?: string; // Para Desktop Local
  tracksProcessed: number;
}
