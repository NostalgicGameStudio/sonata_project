import asyncio
from typing import Optional
import yt_dlp

from core.domain.models import VideoInfo
from core.services.interfaces import IMetadataExtractor, ITimestampParser
from core.services.timestamp_parser import RegexTimestampParser


class YtDlpMetadataService(IMetadataExtractor):
    """
    Serviço desacoplado para extração assíncrona de metadados via yt-dlp.
    Aplica Inversão de Dependência ao receber o parser de timestamps no construtor.
    """

    def __init__(self, parser: Optional[ITimestampParser] = None):
        self._parser = parser or RegexTimestampParser()

    async def extract_metadata(self, url: str, mode: Optional[str] = "album") -> VideoInfo:
        # Executa em threadpool assíncrono para evitar bloquear o event loop do asyncio
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self._extract_sync, url, mode)

    def _extract_sync(self, url: str, mode: Optional[str] = "album") -> VideoInfo:
        is_playlist_mode = mode == "playlist" or "/playlist" in url or "list=" in url

        ydl_opts = {
            "extract_flat": "in_playlist" if is_playlist_mode else False,
            "skip_download": True,
            "quiet": True,
            "no_warnings": True,
            "ignoreerrors": True,
            "noplaylist": not is_playlist_mode,
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if not info:
                raise ValueError("Não foi possível obter metadados para a URL fornecida.")

            # Se for playlist
            if info.get("_type") == "playlist" or "entries" in info:
                from core.domain.models import PlaylistEntry
                entries = info.get("entries") or []
                playlist_entries = []
                for idx, e in enumerate(entries):
                    if not e:
                        continue
                    entry_id = e.get("id") or ""
                    entry_url = e.get("url") or (f"https://www.youtube.com/watch?v={entry_id}" if entry_id else "")
                    thumb = (e.get("thumbnails") and e.get("thumbnails")[0].get("url")) or ""
                    playlist_entries.append(
                        PlaylistEntry(
                            id=entry_id,
                            title=e.get("title") or f"Faixa {idx + 1}",
                            author=e.get("uploader") or e.get("channel") or info.get("uploader") or "Artista Desconhecido",
                            duration_seconds=int(e.get("duration") or 0),
                            url=entry_url,
                            thumbnail_url=thumb
                        )
                    )

                cover_thumb = (info.get("thumbnails") and info.get("thumbnails")[0].get("url")) or (playlist_entries[0].thumbnail_url if playlist_entries else "")
                total_duration = sum(p.duration_seconds for p in playlist_entries)

                return VideoInfo(
                    id=info.get("id") or "playlist",
                    title=info.get("title") or "Playlist do YouTube",
                    author=info.get("uploader") or info.get("channel") or "Vários Artistas",
                    duration_seconds=total_duration,
                    thumbnail_url=cover_thumb,
                    raw_description=info.get("description") or "",
                    is_playlist=True,
                    playlist_entries=playlist_entries,
                    suggested_tracks=[]
                )

            # Se for vídeo individual
            duration = int(info.get("duration") or 0)
            description = info.get("description") or ""

            suggested = self._parser.parse(description, total_duration_seconds=duration) if mode == "album" else []

            return VideoInfo(
                id=info.get("id") or "",
                title=info.get("title") or "Áudio Desconhecido",
                author=info.get("uploader") or info.get("channel") or "Artista Desconhecido",
                duration_seconds=duration,
                thumbnail_url=info.get("thumbnail") or "",
                raw_description=description,
                is_playlist=False,
                playlist_entries=[],
                suggested_tracks=suggested
            )

