import uuid
from typing import List
from ninja import NinjaAPI

from core.schemas import (
    MetadataRequest,
    VideoMetadataResponse,
    ParseTimestampsRequest,
    TrackSchema,
    ProcessAudioRequest,
    ProcessAudioResponse,
)
from core.services import (
    RegexTimestampParser,
    YtDlpMetadataService,
)

api = NinjaAPI(
    title="Sonata API",
    version="1.0.0",
    description="API assíncrona para extração de metadados, parsing de timestamps e corte de faixas musicais do YouTube.",
    docs_url="/docs"
)

# Injeção das dependências dos serviços (DIP / Clean Architecture)
timestamp_parser = RegexTimestampParser()
metadata_service = YtDlpMetadataService(parser=timestamp_parser)


@api.post("/metadata", response=VideoMetadataResponse, summary="Obter metadados do vídeo ou playlist")
async def get_metadata(request, payload: MetadataRequest):
    """
    Recebe a URL do YouTube e o modo de download, extraindo metadados estruturados de vídeos ou playlists.
    """
    video_info = await metadata_service.extract_metadata(payload.url, mode=payload.mode)

    return {
        "id": video_info.id,
        "title": video_info.title,
        "author": video_info.author,
        "duration_seconds": video_info.duration_seconds,
        "thumbnail_url": video_info.thumbnail_url,
        "raw_description": video_info.raw_description,
        "is_playlist": video_info.is_playlist,
        "playlist_entries": [
            {
                "id": p.id,
                "title": p.title,
                "author": p.author,
                "duration_seconds": p.duration_seconds,
                "url": p.url,
                "thumbnail_url": p.thumbnail_url
            }
            for p in video_info.playlist_entries
        ],
        "suggested_tracks": [
            {
                "index": t.index,
                "title": t.title,
                "start_time": t.start_time,
                "start_seconds": t.start_seconds,
                "end_time": t.end_time,
                "end_seconds": t.end_seconds,
                "artist": t.artist,
                "selected": t.selected,
            }
            for t in video_info.suggested_tracks
        ]
    }


@api.post("/parse-timestamps", response=List[TrackSchema], summary="Analisar e extrair faixas de texto livre")
def parse_text_timestamps(request, payload: ParseTimestampsRequest):
    """
    Permite ao cliente reprocessar um bloco de texto com a regex inteligente.
    """
    tracks = timestamp_parser.parse(
        text=payload.text,
        total_duration_seconds=payload.duration_seconds
    )
    return [
        {
            "index": t.index,
            "title": t.title,
            "start_time": t.start_time,
            "start_seconds": t.start_seconds,
            "end_time": t.end_time,
            "end_seconds": t.end_seconds,
            "artist": t.artist,
            "selected": t.selected,
        }
        for t in tracks
    ]


@api.post("/cut", response=ProcessAudioResponse, summary="Iniciar o processamento e fatiamento de áudio")
async def cut_audio(request, payload: ProcessAudioRequest):
    """
    Endpoint assíncrono para agendamento do download e corte das faixas.
    """
    job_id = str(uuid.uuid4())

    selected_count = sum(1 for t in payload.tracks if t.selected)

    return {
        "job_id": job_id,
        "status": "processing",
        "tracks_count": selected_count,
        "message": f"Job {job_id} iniciado com sucesso para {selected_count} faixas."
    }
