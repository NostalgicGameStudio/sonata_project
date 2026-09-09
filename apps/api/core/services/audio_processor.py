import asyncio
import os
import shutil
import tempfile
import zipfile
import subprocess
from pathlib import Path
from typing import List, Optional, Dict, Tuple
import yt_dlp

from core.domain.models import Track
from core.services.ffmpeg_service import sanitize_filename


def get_ffmpeg_path() -> str:
    """
    Localiza o executável do ffmpeg no PATH, no workspace ou em node_modules.
    """
    found = shutil.which("ffmpeg")
    if found:
        return found

    curr = Path(__file__).resolve().parent
    for _ in range(6):
        possible_paths = [
            curr / "node_modules" / "ffmpeg-static" / ("ffmpeg.exe" if os.name == "nt" else "ffmpeg"),
            curr / "apps" / "desktop" / "node_modules" / "ffmpeg-static" / ("ffmpeg.exe" if os.name == "nt" else "ffmpeg"),
        ]
        for p in possible_paths:
            if p.exists():
                return str(p)
        if curr.parent == curr:
            break
        curr = curr.parent

    return "ffmpeg"


class AudioProcessorService:
    """
    Serviço para download e fatiamento de áudio via API Web.
    """

    def __init__(self, ffmpeg_path: Optional[str] = None):
        self.ffmpeg_path = ffmpeg_path or get_ffmpeg_path()
        self.job_files: Dict[str, Tuple[str, str, str]] = {}

    def get_job_file(self, job_id: str) -> Optional[Tuple[str, str]]:
        """
        Recupera o caminho do arquivo gerado para o download.
        """
        if job_id in self.job_files:
            file_path, filename, _ = self.job_files[job_id]
            if os.path.exists(file_path):
                return file_path, filename
        return None

    async def process(
        self,
        job_id: str,
        mode: str,
        video_url: str,
        tracks: List[Track],
        output_format: str = "mp3",
        bitrate: str = "320k",
        album_title: Optional[str] = None,
        artist: Optional[str] = None,
    ) -> Tuple[int, List[Dict[str, str]]]:
        """
        Processa as faixas de áudio assincronamente em threadpool.
        """
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(
            None,
            self._process_sync,
            job_id,
            mode,
            video_url,
            tracks,
            output_format,
            bitrate,
            album_title,
            artist,
        )

    def _process_sync(
        self,
        job_id: str,
        mode: str,
        video_url: str,
        tracks: List[Track],
        output_format: str = "mp3",
        bitrate: str = "320k",
        album_title: Optional[str] = None,
        artist: Optional[str] = None,
    ) -> Tuple[int, List[Dict[str, str]]]:
        work_dir = tempfile.mkdtemp(prefix=f"sonata-web-{job_id}-")
        skipped_tracks: List[Dict[str, str]] = []

        try:
            selected_tracks = [t for t in tracks if t.selected]
            if not selected_tracks:
                raise ValueError("Nenhuma faixa selecionada para download.")

            if mode == "single":
                track = selected_tracks[0]
                safe_title = sanitize_filename(track.title) or "Musica"
                safe_artist = sanitize_filename(track.artist or artist or "")
                out_filename = (
                    f"{safe_artist} - {safe_title}.{output_format}"
                    if safe_artist
                    else f"{safe_title}.{output_format}"
                )
                final_file_path = os.path.join(work_dir, out_filename)

                raw_template = os.path.join(work_dir, "source.%(ext)s")
                ydl_opts = {
                    "format": "bestaudio/best",
                    "outtmpl": raw_template,
                    "ffmpeg_location": self.ffmpeg_path,
                    "quiet": True,
                    "no_warnings": True,
                    "ignoreerrors": True,
                    "noplaylist": True,
                }

                download_target = video_url
                if "spotify.com" in video_url or not video_url.startswith("http"):
                    search_term = f"{track.artist or artist or ''} - {track.title}".strip(" -")
                    download_target = f"ytsearch1:{search_term}"

                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    ydl.download([download_target])

                actual_source = None
                for f in os.listdir(work_dir):
                    if f.startswith("source."):
                        actual_source = os.path.join(work_dir, f)
                        break

                if not actual_source or not os.path.exists(actual_source):
                    raise RuntimeError("Não foi possível baixar o áudio do vídeo.")

                cmd = [self.ffmpeg_path, "-y", "-i", actual_source]
                if output_format == "mp3":
                    cmd.extend([
                        "-c:a", "libmp3lame",
                        "-b:a", bitrate,
                        "-metadata", f"title={track.title}",
                    ])
                    if track.artist or artist:
                        cmd.extend(["-metadata", f"artist={track.artist or artist}"])
                else:
                    cmd.extend(["-c:a", "copy"])
                cmd.append(final_file_path)

                subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

                self.job_files[job_id] = (final_file_path, out_filename, work_dir)
                return 1, []

            elif mode == "playlist":
                tracks_dir = os.path.join(work_dir, "tracks")
                os.makedirs(tracks_dir, exist_ok=True)
                downloaded_count = 0

                for t in selected_tracks:
                    raw_id = getattr(t, 'id', None)
                    if raw_id and not raw_id.startswith('spotify-'):
                        fallback_url = f"https://www.youtube.com/watch?v={raw_id}"
                    else:
                        fallback_url = video_url

                    url_to_download = t.video_url or fallback_url
                    if "spotify.com" in url_to_download:
                        search_term = f"{t.artist or ''} - {t.title}".strip(" -")
                        url_to_download = f"ytsearch1:{search_term}"
                    safe_title = sanitize_filename(t.title) or f"Faixa_{t.index:02d}"
                    safe_artist = sanitize_filename(t.artist or "")
                    file_prefix = (
                        f"{t.index:02d} - {safe_artist} - {safe_title}"
                        if safe_artist
                        else f"{t.index:02d} - {safe_title}"
                    )
                    temp_source = os.path.join(tracks_dir, f"temp_{t.index}.%(ext)s")
                    final_track_path = os.path.join(tracks_dir, f"{file_prefix}.{output_format}")

                    ydl_opts = {
                        "format": "bestaudio/best",
                        "outtmpl": temp_source,
                        "ffmpeg_location": self.ffmpeg_path,
                        "quiet": True,
                        "no_warnings": True,
                        "ignoreerrors": True,
                        "noplaylist": True,
                    }

                    try:
                        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                            ydl.download([url_to_download])

                        raw_temp = None
                        for f in os.listdir(tracks_dir):
                            if f.startswith(f"temp_{t.index}."):
                                raw_temp = os.path.join(tracks_dir, f)
                                break

                        if raw_temp and os.path.exists(raw_temp):
                            cmd = [self.ffmpeg_path, "-y", "-i", raw_temp]
                            if output_format == "mp3":
                                cmd.extend([
                                    "-c:a", "libmp3lame",
                                    "-b:a", bitrate,
                                    "-metadata", f"title={t.title}",
                                ])
                                if t.artist:
                                    cmd.extend(["-metadata", f"artist={t.artist}"])
                            else:
                                cmd.extend(["-c:a", "copy"])
                            cmd.append(final_track_path)
                            subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                            os.remove(raw_temp)

                            if os.path.exists(final_track_path):
                                downloaded_count += 1
                    except Exception as e:
                        skipped_tracks.append({"title": t.title, "reason": str(e)})

                if downloaded_count == 0:
                    raise RuntimeError("Nenhuma faixa da playlist pôde ser baixada.")

                zip_name = f"{sanitize_filename(album_title or 'Playlist_Sonata')}.zip"
                zip_path = os.path.join(work_dir, zip_name)
                with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
                    for root, _, files in os.walk(tracks_dir):
                        for f in files:
                            if f.endswith(f".{output_format}"):
                                full_p = os.path.join(root, f)
                                zf.write(full_p, arcname=f)

                self.job_files[job_id] = (zip_path, zip_name, work_dir)
                return downloaded_count, skipped_tracks

            else:
                raw_source_template = os.path.join(work_dir, "full_source.%(ext)s")
                ydl_opts = {
                    "format": "bestaudio/best",
                    "outtmpl": raw_source_template,
                    "ffmpeg_location": self.ffmpeg_path,
                    "quiet": True,
                    "no_warnings": True,
                    "ignoreerrors": True,
                    "noplaylist": True,
                }

                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    ydl.download([video_url])

                actual_source = None
                for f in os.listdir(work_dir):
                    if f.startswith("full_source."):
                        actual_source = os.path.join(work_dir, f)
                        break

                if not actual_source or not os.path.exists(actual_source):
                    raise RuntimeError("Falha ao baixar o áudio base para fatiamento do álbum.")

                cut_dir = os.path.join(work_dir, "cut_tracks")
                os.makedirs(cut_dir, exist_ok=True)

                cut_files = []
                for t in selected_tracks:
                    safe_title = sanitize_filename(t.title) or f"Faixa_{t.index:02d}"
                    out_name = f"{t.index:02d} - {safe_title}.{output_format}"
                    out_path = os.path.join(cut_dir, out_name)

                    cmd = [
                        self.ffmpeg_path,
                        "-y",
                        "-ss", str(t.start_seconds or 0),
                        "-i", actual_source,
                    ]
                    if t.end_seconds is not None and t.end_seconds > (t.start_seconds or 0):
                        duration = t.end_seconds - (t.start_seconds or 0)
                        cmd.extend(["-t", str(duration)])

                    if output_format == "mp3":
                        cmd.extend([
                            "-c:a", "libmp3lame",
                            "-b:a", bitrate,
                            "-metadata", f"title={t.title}",
                            "-metadata", f"track={t.index}/{len(selected_tracks)}",
                        ])
                        if t.artist or artist:
                            cmd.extend(["-metadata", f"artist={t.artist or artist}"])
                        if album_title:
                            cmd.extend(["-metadata", f"album={album_title}"])
                    else:
                        cmd.extend(["-c:a", "copy"])

                    cmd.append(out_path)
                    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

                    if os.path.exists(out_path):
                        cut_files.append(out_path)

                if not cut_files:
                    raise RuntimeError("Nenhuma faixa pôde ser fatiada.")

                zip_name = f"{sanitize_filename(album_title or 'Album_Sonata')}.zip"
                zip_path = os.path.join(work_dir, zip_name)
                with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
                    for cf in cut_files:
                        zf.write(cf, arcname=os.path.basename(cf))

                self.job_files[job_id] = (zip_path, zip_name, work_dir)
                return len(cut_files), []

        except Exception as e:
            shutil.rmtree(work_dir, ignore_errors=True)
            raise e
