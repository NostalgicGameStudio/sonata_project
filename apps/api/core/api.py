import uuid
from typing import List
from django.http import FileResponse, Http404
from ninja import NinjaAPI

from core.domain.models import Track
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
    AudioProcessorService,
)

api = NinjaAPI(
    title="Sonata API",
    version="1.0.0",
    description="API assíncrona para extração de metadados, parsing de timestamps e corte de faixas musicais do YouTube.",
    docs_url="/docs"
)

timestamp_parser = RegexTimestampParser()
metadata_service = YtDlpMetadataService(parser=timestamp_parser)
audio_processor = AudioProcessorService()


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
    Endpoint assíncrono para download e corte das faixas com entrega direta para web.
    """
    job_id = str(uuid.uuid4())

    domain_tracks = [
        Track(
            index=t.index,
            title=t.title,
            start_time=t.start_time or "00:00",
            start_seconds=t.start_seconds or 0,
            end_time=t.end_time,
            end_seconds=t.end_seconds,
            artist=t.artist,
            selected=t.selected,
            video_url=t.video_url
        )
        for t in payload.tracks
    ]

    processed_count, skipped = await audio_processor.process(
        job_id=job_id,
        mode=payload.mode or "album",
        video_url=payload.video_url,
        tracks=domain_tracks,
        output_format=payload.output_format or "mp3",
        bitrate=payload.bitrate or "320k",
        album_title=payload.album_title,
        artist=payload.artist
    )

    return {
        "job_id": job_id,
        "status": "completed",
        "tracks_count": len(payload.tracks),
        "tracks_processed": processed_count,
        "download_url": f"/api/v1/download/{job_id}",
        "message": f"{processed_count} faixa(s) gerada(s) com sucesso!"
    }


@api.get("/download/{job_id}", summary="Download do arquivo de áudio ou arquivo compactado ZIP")
def download_audio_job(request, job_id: str):
    """
    Retorna o arquivo de áudio individual ou o arquivo ZIP com todas as faixas.
    """
    job = audio_processor.get_job_file(job_id)
    if not job:
        raise Http404("Arquivo não encontrado ou expirado.")

    file_path, filename = job
    return FileResponse(open(file_path, "rb"), as_attachment=True, filename=filename)
