import sys
import os
import json

# Força codificação UTF-8 explícita no Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
API_ROOT = os.path.dirname(CURRENT_DIR)
if API_ROOT not in sys.path:
    sys.path.insert(0, API_ROOT)

from core.services.spotify_service import SpotifyMetadataService


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "URL não fornecida"}))
        sys.exit(1)

    url = sys.argv[1].strip()
    service = SpotifyMetadataService()

    try:
        video_info = service._extract_sync(url)
        output = {
            "id": video_info.id,
            "title": video_info.title,
            "author": video_info.author,
            "durationSeconds": video_info.duration_seconds,
            "duration_seconds": video_info.duration_seconds,
            "thumbnailUrl": video_info.thumbnail_url,
            "thumbnail_url": video_info.thumbnail_url,
            "rawDescription": video_info.raw_description,
            "raw_description": video_info.raw_description,
            "isPlaylist": video_info.is_playlist,
            "is_playlist": video_info.is_playlist,
            "playlistEntries": [
                {
                    "id": p.id,
                    "title": p.title,
                    "author": p.author,
                    "durationSeconds": p.duration_seconds,
                    "duration_seconds": p.duration_seconds,
                    "url": p.url,
                    "thumbnailUrl": p.thumbnail_url,
                    "thumbnail_url": p.thumbnail_url
                }
                for p in video_info.playlist_entries
            ],
            "playlist_entries": [
                {
                    "id": p.id,
                    "title": p.title,
                    "author": p.author,
                    "durationSeconds": p.duration_seconds,
                    "duration_seconds": p.duration_seconds,
                    "url": p.url,
                    "thumbnailUrl": p.thumbnail_url,
                    "thumbnail_url": p.thumbnail_url
                }
                for p in video_info.playlist_entries
            ]
        }
        print(json.dumps(output, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
