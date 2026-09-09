/**
 * Modos de operação suportados pelo Sonata
 */
export type DownloadMode = 'single' | 'album' | 'playlist';

/**
 * Item individual de uma playlist
 */
export interface PlaylistEntry {
  id: string;
  title: string;
  author: string;
  durationSeconds: number;
  url: string;
  thumbnailUrl?: string;
}

/**
 * Metadados essenciais de um vídeo ou playlist do YouTube
 */
export interface VideoMetadata {
  id: string;
  title: string;
  author: string;
  durationSeconds: number;
  thumbnailUrl: string;
  rawDescription: string;
  isPlaylist?: boolean;
  playlistEntries?: PlaylistEntry[];
}

/**
 * Representação de uma faixa musical
 */
export interface Track {
  id: string;
  index: number;
  title: string;
  artist?: string;
  startTime?: string;
  startSeconds?: number;
  endTime?: string;
  endSeconds?: number;
  durationSeconds?: number;
  selected: boolean;
  videoUrl?: string;
}

/**
 * Status do processo de corte / download
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
  mode: DownloadMode;
  videoUrl: string;
  tracks: Track[];
  outputFormat: 'mp3' | 'flac' | 'wav' | 'aac';
  bitrate?: string;
  includeMetadataTags?: boolean;
  destinationDirectory?: string;
  albumTitle?: string;
  artist?: string;
}

/**
 * Resultado do processamento
 */
export interface ProcessAudioResult {
  jobId: string;
  downloadUrl?: string;
  outputDirectory?: string;
  tracksProcessed: number;
  skippedTracks?: Array<{ title: string; reason: string }>;
}
