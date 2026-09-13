import type { VideoMetadata, PlaylistEntry } from '@sonata/shared-types';

interface SpotifyParsedUrl {
  type: 'track' | 'album' | 'playlist';
  id: string;
}

export class SpotifyMetadataService {
  /**
   * Identifica e valida a URL ou URI do Spotify
   */
  public parseSpotifyUrl(inputUrl: string): SpotifyParsedUrl | null {
    const clean = inputUrl.trim();

    // Formato URI: spotify:track:xxx, spotify:album:xxx, spotify:playlist:xxx
    const uriMatch = clean.match(/^spotify:(track|album|playlist):([a-zA-Z0-9]+)/i);
    if (uriMatch) {
      return {
        type: uriMatch[1].toLowerCase() as 'track' | 'album' | 'playlist',
        id: uriMatch[2]
      };
    }

    // Formato URL: open.spotify.com/(intl-[a-z]+/)?(track|album|playlist)/xxx
    const urlMatch = clean.match(/(track|album|playlist)\/([a-zA-Z0-9]+)/i);
    if (urlMatch) {
      return {
        type: urlMatch[1].toLowerCase() as 'track' | 'album' | 'playlist',
        id: urlMatch[2]
      };
    }

    return null;
  }

  /**
   * Extrai a imagem com melhor resolução disponível
   */
  private getBestImage(images?: any[]): string {
    if (!images || !Array.isArray(images) || images.length === 0) return '';
    const sorted = [...images].sort((a, b) => {
      const sizeA = (a.maxWidth || a.width || 0) * (a.maxHeight || a.height || 0);
      const sizeB = (b.maxWidth || b.width || 0) * (b.maxHeight || b.height || 0);
      return sizeB - sizeA;
    });
    return sorted[0]?.url || images[0]?.url || '';
  }

  /**
   * Requisição com política de retentativas para evitar falhas transitórias
   */
  private async fetchWithRetry(url: string, retries = 2, delayMs = 600): Promise<Response> {
    let lastError: any;
    for (let i = 0; i <= retries; i++) {
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
          }
        });
        if (res.ok) return res;
        if (res.status >= 500 || res.status === 429) {
          lastError = new Error(`HTTP ${res.status}`);
          if (i < retries) {
            await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
            continue;
          }
        }
        return res;
      } catch (err) {
        lastError = err;
        if (i < retries) {
          await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
        }
      }
    }
    throw lastError || new Error(`Falha de conexão com ${url}`);
  }

  /**
   * Extrai metadados completos de uma música, álbum ou playlist do Spotify
   */
  public async extractMetadata(url: string): Promise<VideoMetadata> {
    let targetUrl = url.trim();

    // Resolve redirecionamento para links encurtados
    if (targetUrl.includes('spotify.link/') || targetUrl.includes('spoti.fi/')) {
      try {
        const headRes = await fetch(targetUrl, { method: 'HEAD', redirect: 'follow' });
        targetUrl = headRes.url || targetUrl;
      } catch {
        // Segue com URL original caso HEAD falhe
      }
    }

    const parsed = this.parseSpotifyUrl(targetUrl);
    if (!parsed) {
      throw new Error(`Link do Spotify inválido ou não suportado: "${url}"`);
    }

    const embedUrl = `https://open.spotify.com/embed/${parsed.type}/${parsed.id}`;
    const res = await this.fetchWithRetry(embedUrl);

    if (!res.ok) {
      // Fallback via oEmbed apenas se for faixa individual
      if (parsed.type === 'track') {
        try {
          const oembedRes = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(targetUrl)}`);
          if (oembedRes.ok) {
            const oembed = await oembedRes.json();
            return {
              id: parsed.id,
              title: oembed.title || 'Música do Spotify',
              author: oembed.author_name || 'Artista Desconhecido',
              durationSeconds: 0,
              thumbnailUrl: oembed.thumbnail_url || '',
              rawDescription: '',
              isPlaylist: false,
              playlistEntries: []
            };
          }
        } catch {
          // Ignora erro no fallback e lança o erro da requisição principal
        }
      }
      throw new Error(`Não foi possível acessar os dados do Spotify (HTTP ${res.status})`);
    }

    const html = await res.text();
    const nextMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!nextMatch) {
      throw new Error('Formato da resposta do Spotify incompatível ou página protegida.');
    }

    const json = JSON.parse(nextMatch[1]);
    const entity = json?.props?.pageProps?.state?.data?.entity;
    if (!entity) {
      throw new Error('Nenhum dado encontrado para o link do Spotify informado.');
    }

    const thumb =
      this.getBestImage(entity.visualIdentity?.image) ||
      this.getBestImage(entity.images) ||
      this.getBestImage(entity.coverArt?.sources) ||
      '';

    if (parsed.type === 'track') {
      const artistNames = Array.isArray(entity.artists)
        ? entity.artists.map((a: any) => a.name).filter(Boolean)
        : [];
      const author = artistNames.join(', ') || entity.subtitle || 'Artista Desconhecido';
      const durationSeconds = Math.floor((entity.duration || 0) / 1000);

      return {
        id: entity.id || parsed.id,
        title: entity.title || entity.name || 'Música do Spotify',
        author,
        durationSeconds,
        thumbnailUrl: thumb,
        rawDescription: '',
        isPlaylist: false,
        playlistEntries: []
      };
    }

    // Processamento de Playlist ou Álbum
    const rawTracks = Array.isArray(entity.trackList) ? entity.trackList : [];
    if (rawTracks.length === 0) {
      throw new Error('Nenhuma faixa encontrada neste álbum ou playlist do Spotify.');
    }

    const isAlbum = parsed.type === 'album';
    const defaultTitle = isAlbum ? 'Álbum do Spotify' : 'Playlist do Spotify';
    const defaultAuthor = isAlbum ? (entity.subtitle || 'Vários Artistas') : 'Vários Artistas';

    const playlistEntries: PlaylistEntry[] = rawTracks.map((t: any, index: number) => {
      const trackTitle = t.title || t.name || `Faixa ${index + 1}`;
      const trackAuthor =
        t.subtitle ||
        (Array.isArray(t.artists) ? t.artists.map((a: any) => a.name).join(', ') : '') ||
        defaultAuthor;
      const duration = Math.floor((t.duration || 0) / 1000);
      const trackId = t.uri ? t.uri.split(':').pop() : `${parsed.type}-track-${index + 1}`;
      const searchQuery = `ytsearch1:${trackAuthor ? trackAuthor + ' - ' : ''}${trackTitle}`.trim();

      return {
        id: trackId,
        title: trackTitle,
        author: trackAuthor,
        durationSeconds: duration,
        url: searchQuery,
        thumbnailUrl: thumb
      };
    });

    const totalDuration = playlistEntries.reduce((acc, curr) => acc + curr.durationSeconds, 0);

    return {
      id: entity.id || parsed.id,
      title: entity.title || entity.name || defaultTitle,
      author: entity.subtitle || defaultAuthor,
      durationSeconds: totalDuration,
      thumbnailUrl: thumb,
      rawDescription: '',
      isPlaylist: true,
      playlistEntries
    };
  }
}
