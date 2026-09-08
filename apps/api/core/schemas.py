from typing import List, Optional
from ninja import Schema


class PlaylistEntrySchema(Schema):
    id: str
    title: str
    author: str
    duration_seconds: int
    url: str
    thumbnail_url: Optional[str] = ""


class TrackSchema(Schema):
    index: int
    title: str
    start_time: Optional[str] = "00:00"
    start_seconds: Optional[int] = 0
    end_time: Optional[str] = None
    end_seconds: Optional[int] = None
    duration_seconds: Optional[int] = None
    artist: Optional[str] = None
    selected: bool = True
    video_url: Optional[str] = None


class VideoMetadataResponse(Schema):
    id: str
    title: str
    author: str
    duration_seconds: int
    thumbnail_url: str
    raw_description: str
    is_playlist: bool = False
    playlist_entries: List[PlaylistEntrySchema] = []
    suggested_tracks: List[TrackSchema] = []


class MetadataRequest(Schema):
    url: str
    mode: Optional[str] = "album"


class ParseTimestampsRequest(Schema):
    text: str
    duration_seconds: Optional[int] = None


class ProcessAudioRequest(Schema):
    mode: Optional[str] = "album"
    video_url: str
    tracks: List[TrackSchema]
    output_format: str = "mp3"
    bitrate: str = "320k"
    album_title: Optional[str] = None
    artist: Optional[str] = None


class ProcessAudioResponse(Schema):
    job_id: str
    status: str
    tracks_count: int
    message: str

