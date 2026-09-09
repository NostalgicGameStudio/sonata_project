import { ipcMain, dialog, type BrowserWindow } from 'electron';
import type { ProcessAudioPayload, DownloadMode } from '@sonata/shared-types';
import { LocalCutterService } from './services/localCutter';

export function registerIpcHandlers(mainWindow: BrowserWindow, cutterService: LocalCutterService): void {
  ipcMain.handle('fetch-metadata', async (_event, url: string, mode?: DownloadMode) => {
    return cutterService.fetchMetadata(url, mode);
  });

  ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Selecionar pasta de destino para salvar as músicas',
      properties: ['openDirectory', 'createDirectory']
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });

  ipcMain.handle('process-audio', async (_event, payload: ProcessAudioPayload) => {
    return cutterService.processAudio(payload, (progress) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('cutter-progress', progress);
      }
    });
  });
}
