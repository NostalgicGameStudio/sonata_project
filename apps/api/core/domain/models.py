from dataclasses import dataclass, field
from typing import Optional, List


@dataclass(frozen=True)
class PlaylistEntry:
    id: str
    title: str
    author: str
    duration_seconds: int
    url: str
    thumbnail_url: str = ""


@dataclass(frozen=True)
class Track:
    """
    Entidade de Domínio representando uma faixa musical individual.
    Princípio da Imutabilidade e Modelo Rico.
    """
    index: int
    title: str = ""
    start_time: str = "00:00"
    start_seconds: int = 0
    end_time: Optional[str] = None
    end_seconds: Optional[int] = None
    artist: Optional[str] = None
    selected: bool = True
    video_url: Optional[str] = None
    duration_seconds_override: Optional[int] = None

    @property
    def duration_seconds(self) -> Optional[int]:
        if self.duration_seconds_override is not None:
            return self.duration_seconds_override
        if self.end_seconds is not None:
            return max(0, self.end_seconds - self.start_seconds)
        return None


@dataclass(frozen=True)
class VideoInfo:
    """
    Informações estruturadas de metadados extraídos do YouTube.
    """
    id: str
    title: str
    author: str
    duration_seconds: int
    thumbnail_url: str
    raw_description: str
    is_playlist: bool = False
    playlist_entries: List[PlaylistEntry] = field(default_factory=list)
    suggested_tracks: List[Track] = field(default_factory=list)

