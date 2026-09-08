import asyncio
import os
import re
from typing import List, Optional
from core.domain.models import Track
from core.services.interfaces import IAudioCutter


def sanitize_filename(name: str) -> str:
    """
    Remove caracteres proibidos pelo sistema de arquivos.
    """
    return re.sub(r'[\\/*?:"<>|]', "", name).strip()


class FfmpegAudioCutter(IAudioCutter):
    """
    Serviço assíncrono para corte e exportação de faixas com FFmpeg.
    """

    def __init__(self, ffmpeg_binary: Optional[str] = None):
        if not ffmpeg_binary:
            from core.services.audio_processor import get_ffmpeg_path
            self.ffmpeg_binary = get_ffmpeg_path()
        else:
            self.ffmpeg_binary = ffmpeg_binary

    async def cut_tracks(
        self,
        audio_source_path: str,
        tracks: List[Track],
        output_format: str = "mp3",
        bitrate: str = "320k"
    ) -> List[str]:
        output_dir = os.path.dirname(audio_source_path)
        generated_files: List[str] = []

        for track in tracks:
            if not track.selected:
                continue

            safe_title = sanitize_filename(track.title) or f"Faixa_{track.index:02d}"
            filename = f"{track.index:02d} - {safe_title}.{output_format}"
            output_path = os.path.join(output_dir, filename)

            cmd = [
                self.ffmpeg_binary,
                "-y",                       # Sobrescrever saída se existir
                "-ss", str(track.start_seconds),
                "-i", audio_source_path,
            ]

            if track.end_seconds is not None and track.end_seconds > track.start_seconds:
                duration = track.end_seconds - track.start_seconds
                cmd.extend(["-t", str(duration)])

            if output_format == "mp3":
                cmd.extend([
                    "-c:a", "libmp3lame",
                    "-b:a", bitrate,
                    "-metadata", f"title={track.title}",
                    "-metadata", f"track={track.index}/{len(tracks)}",
                ])
                if track.artist:
                    cmd.extend(["-metadata", f"artist={track.artist}"])
            else:
                cmd.extend(["-c:a", "copy"])

            cmd.append(output_path)

            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL
            )
            await process.wait()

            if os.path.exists(output_path):
                generated_files.append(output_path)

        return generated_files
