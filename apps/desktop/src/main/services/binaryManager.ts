import fs from 'fs';
import path from 'path';
import https from 'https';
import { app } from 'electron';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export class BinaryManager {
  private readonly binDir: string;
  private readonly ytdlpPath: string;

  constructor() {
    this.binDir = path.join(app.getPath('userData'), 'bin');
    const isWindows = process.platform === 'win32';
    this.ytdlpPath = path.join(this.binDir, isWindows ? 'yt-dlp.exe' : 'yt-dlp');
  }

  public getYtDlpPath(): string {
    // Se existir binário atualizado na pasta do usuário, use-o; senão busca no PATH do sistema
    if (fs.existsSync(this.ytdlpPath)) {
      return this.ytdlpPath;
    }
    return process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
  }

  public getFfmpegPath(): string {
    return process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
  }

  /**
   * Checagem e atualização silenciosa em background via API do GitHub
   */
  public async checkForUpdatesSilently(): Promise<void> {
    try {
      if (!fs.existsSync(this.binDir)) {
        fs.mkdirSync(this.binDir, { recursive: true });
      }

      const latestRelease = await this.fetchLatestGitHubRelease();
      if (!latestRelease || !latestRelease.tag_name) return;

      const localVersion = await this.getLocalYtDlpVersion();
      const remoteVersion = latestRelease.tag_name;

      if (localVersion !== remoteVersion) {
        const assetName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
        const targetAsset = latestRelease.assets.find((a: any) => a.name === assetName);

        if (targetAsset && targetAsset.browser_download_url) {
          await this.downloadBinary(targetAsset.browser_download_url, this.ytdlpPath);
          if (process.platform !== 'win32') {
            fs.chmodSync(this.ytdlpPath, 0o755);
          }
        }
      }
    } catch {
      // Falha silenciosa: modo offline continua funcionando com o binário existente
    }
  }

  private async getLocalYtDlpVersion(): Promise<string | null> {
    try {
      const currentBin = this.getYtDlpPath();
      const { stdout } = await execFileAsync(currentBin, ['--version']);
      return stdout.trim();
    } catch {
      return null;
    }
  }

  private fetchLatestGitHubRelease(): Promise<any> {
    return new Promise((resolve) => {
      const options = {
        hostname: 'api.github.com',
        path: '/repos/yt-dlp/yt-dlp/releases/latest',
        method: 'GET',
        headers: {
          'User-Agent': 'Sonata-Desktop-App',
          'Accept': 'application/vnd.github.v3+json'
        }
      };

      const req = https.request(options, (res) => {
        if (res.statusCode !== 200) {
          resolve(null);
          return;
        }

        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(null);
          }
        });
      });

      req.on('error', () => resolve(null));
      req.setTimeout(5000, () => {
        req.destroy();
        resolve(null);
      });
      req.end();
    });
  }

  private downloadBinary(url: string, destPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const tempPath = `${destPath}.tmp`;
      const file = fs.createWriteStream(tempPath);

      const request = (targetUrl: string) => {
        https.get(targetUrl, { headers: { 'User-Agent': 'Sonata-Desktop-App' } }, (res) => {
          // Tratar redirects comuns da CDN do GitHub
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            request(res.headers.location);
            return;
          }

          if (res.statusCode !== 200) {
            file.close();
            fs.unlink(tempPath, () => {});
            reject(new Error(`Download falhou com status ${res.statusCode}`));
            return;
          }

          res.pipe(file);
          file.on('finish', () => {
            file.close(() => {
              fs.rename(tempPath, destPath, (err) => {
                if (err) reject(err);
                else resolve();
              });
            });
          });
        }).on('error', (err) => {
          fs.unlink(tempPath, () => {});
          reject(err);
        });
      };

      request(url);
    });
  }
}
