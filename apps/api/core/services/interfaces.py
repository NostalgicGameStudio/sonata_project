from typing import Protocol, List, Optional
from core.domain.models import Track, VideoInfo


class ITimestampParser(Protocol):
    """
    Contrato para parsers de timestamps (Princípio da Segregação de Interface).
    """
    def parse(self, text: str, total_duration_seconds: Optional[int] = None) -> List[Track]:
        ...


class IMetadataExtractor(Protocol):
    """
    Contrato para extração de metadados do YouTube.
    """
    async def extract_metadata(self, url: str, mode: Optional[str] = "album") -> VideoInfo:
        ...


class IAudioCutter(Protocol):
    """
    Contrato para fatiamento de streams de áudio.
    """
    async def cut_tracks(
        self,
        audio_source_path: str,
        tracks: List[Track],
        output_format: str = "mp3",
        bitrate: str = "320k"
    ) -> List[str]:
        ...
