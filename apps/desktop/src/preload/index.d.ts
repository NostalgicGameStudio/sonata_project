import type { VideoMetadata, ProcessAudioPayload, ProcessAudioResult, CutProgress } from '@sonata/shared-types';

declare global {
  interface Window {
    electronAPI: {
      fetchMetadata: (url: string) => Promise<VideoMetadata>;
      selectDirectory: () => Promise<string | null>;
      processAudio: (payload: ProcessAudioPayload) => Promise<ProcessAudioResult>;
      onProgress: (callback: (progress: CutProgress) => void) => () => void;
    };
  }
}
