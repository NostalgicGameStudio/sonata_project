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

    async def extract_metadata(self, url: str) -> VideoInfo:
        # Executa em threadpool assíncrono para evitar bloquear o event loop do asyncio
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self._extract_sync, url)

    def _extract_sync(self, url: str) -> VideoInfo:
        ydl_opts = {
            "extract_flat": False,
            "skip_download": True,
            "quiet": True,
            "no_warnings": True,
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if not info:
                raise ValueError("Não foi possível obter metadados para a URL fornecida.")

            duration = int(info.get("duration") or 0)
            description = info.get("description") or ""

            suggested = self._parser.parse(description, total_duration_seconds=duration)

            return VideoInfo(
                id=info.get("id") or "",
                title=info.get("title") or "Áudio Desconhecido",
                author=info.get("uploader") or info.get("channel") or "Artista Desconhecido",
                duration_seconds=duration,
                thumbnail_url=info.get("thumbnail") or "",
                raw_description=description,
                suggested_tracks=suggested
            )
