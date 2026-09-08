from typing import List, Optional
from ninja import Schema


class TrackSchema(Schema):
    index: int
    title: str
    start_time: str
    start_seconds: int
    end_time: Optional[str] = None
    end_seconds: Optional[int] = None
    artist: Optional[str] = None
    selected: bool = True


class VideoMetadataResponse(Schema):
    id: str
    title: str
    author: str
    duration_seconds: int
    thumbnail_url: str
    raw_description: str
    suggested_tracks: List[TrackSchema] = []


class MetadataRequest(Schema):
    url: str


class ParseTimestampsRequest(Schema):
    text: str
    duration_seconds: Optional[int] = None


class ProcessAudioRequest(Schema):
    video_url: str
    tracks: List[TrackSchema]
    output_format: str = "mp3"
    bitrate: str = "320k"


class ProcessAudioResponse(Schema):
    job_id: str
    status: str
    tracks_count: int
    message: str
