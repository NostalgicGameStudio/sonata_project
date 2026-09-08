import { contextBridge, ipcRenderer } from 'electron';
import type { ProcessAudioPayload, CutProgress } from '@sonata/shared-types';

const electronAPI = {
  fetchMetadata: (url: string) => ipcRenderer.invoke('fetch-metadata', url),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  processAudio: (payload: ProcessAudioPayload) => ipcRenderer.invoke('process-audio', payload),
  onProgress: (callback: (progress: CutProgress) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: CutProgress) => callback(progress);
    ipcRenderer.on('cutter-progress', handler);
    return () => ipcRenderer.removeListener('cutter-progress', handler);
  }
};

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', electronAPI);
  } catch (error) {
    console.error('Falha ao expor electronAPI no ContextBridge', error);
  }
} else {
  // @ts-ignore
  window.electronAPI = electronAPI;
}
