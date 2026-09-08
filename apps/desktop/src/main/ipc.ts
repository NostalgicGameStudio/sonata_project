import { ipcMain, type BrowserWindow } from 'electron';
import type { ProcessAudioPayload } from '@sonata/shared-types';
import { LocalCutterService } from './services/localCutter';

export function registerIpcHandlers(mainWindow: BrowserWindow, cutterService: LocalCutterService): void {
  ipcMain.handle('fetch-metadata', async (_event, url: string) => {
    return cutterService.fetchMetadata(url);
  });

  ipcMain.handle('process-audio', async (_event, payload: ProcessAudioPayload) => {
    return cutterService.processAudio(payload, (progress) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('cutter-progress', progress);
      }
    });
  });
}
