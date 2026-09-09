import asyncio
import re
from typing import Optional, List
from core.domain.models import VideoInfo, PlaylistEntry
from core.services.interfaces import IMetadataExtractor


def _ensure_spotify_client_ready():
    """
    Garante a inicialização do cliente Spotify sem timeouts de conexões externas.
    Configura o fallback seguro no spotapi e inicializa o SpotifyClient.
    """
    try:
        import spotapi.client
        spotapi.client._secret_cache = spotapi.client._FALLBACK_SECRET
        spotapi.client._cache_expiry = float("inf")
    except Exception:
        pass

    try:
        from spotdl.utils.spotify import SpotifyClient
        try:
            SpotifyClient()
        except Exception:
            SpotifyClient.init(client_id="", client_secret="")
    except Exception:
        pass


def _extract_id_from_url(url: str, kind: str) -> Optional[str]:
    match = re.search(rf"/{kind}/([a-zA-Z0-9]+)", url)
    return match.group(1) if match else None


class SpotifyMetadataService(IMetadataExtractor):

    async def extract_metadata(self, url: str, mode: Optional[str] = "album") -> VideoInfo:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self._extract_sync, url, mode)

    def _extract_sync(self, url: str, mode: Optional[str] = "album") -> VideoInfo:
        _ensure_spotify_client_ready()
        clean_url = url.strip()

        # 1. Tentar via extrator direto de alta performance
        try:
            if "/track/" in clean_url:
                return self._extract_track_fast(clean_url)
            elif "/playlist/" in clean_url:
                return self._extract_playlist_fast(clean_url)
            elif "/album/" in clean_url:
                return self._extract_album_fast(clean_url)
        except Exception:
            # Fallback silencioso para o parse_query caso o método direto falhe
            pass

        # 2. Fallback com spotdl.parse_query
        return self._extract_with_spotdl(clean_url)

    def _extract_track_fast(self, url: str) -> VideoInfo:
        from spotapi import Public
        track_id = _extract_id_from_url(url, "track")
        if not track_id:
            raise ValueError("ID da música não encontrado na URL.")

        info = Public.song_info(track_id)
        d = info.get("data", {}).get("trackUnion", {})
        if not d:
            raise ValueError("Dados da música não encontrados.")

        title = d.get("name")
        if not title:
            raise ValueError("Título da música não encontrado.")
        duration = int(d.get("duration", {}).get("totalMilliseconds", 0) // 1000)

        artists_raw = d.get("firstArtist", {}).get("items", []) + d.get("otherArtists", {}).get("items", [])
        artist_names = [a.get("profile", {}).get("name") for a in artists_raw if a.get("profile", {}).get("name")]
        artist_str = ", ".join(artist_names) or "Artista Desconhecido"

        album = d.get("albumOfTrack", {})
        sources = album.get("coverArt", {}).get("sources", [])
        thumb = sources[0].get("url", "") if sources else ""

        return VideoInfo(
            id=track_id,
            title=title,
            author=artist_str,
            duration_seconds=duration,
            thumbnail_url=thumb,
            raw_description="",
            is_playlist=False,
            playlist_entries=[],
            suggested_tracks=[]
        )

    def _extract_playlist_fast(self, url: str) -> VideoInfo:
        from spotapi import Public
        playlist_id = _extract_id_from_url(url, "playlist")
        if not playlist_id:
            raise ValueError("ID da playlist não encontrado na URL.")

        playlist_entries: List[PlaylistEntry] = []
        cover_thumb = ""

        for page in Public.playlist_info(playlist_id):
            items = page.get("items", [])
            for item in items:
                v2 = item.get("itemV2", {}).get("data", {})
                if not v2 or v2.get("__typename") != "Track":
                    continue

                title = v2.get("name") or "Faixa sem título"
                duration = int(v2.get("trackDuration", {}).get("totalMilliseconds", 0) // 1000)
                uri = v2.get("uri", "")
                track_id = uri.split(":")[-1] if uri else f"track-{len(playlist_entries)+1}"

                artists = [a.get("profile", {}).get("name") for a in v2.get("artists", {}).get("items", []) if a.get("profile", {}).get("name")]
                artist_str = ", ".join(artists) or "Artista Desconhecido"

                album = v2.get("albumOfTrack", {})
                sources = album.get("coverArt", {}).get("sources", [])
                thumb = sources[0].get("url", "") if sources else ""
                if not cover_thumb and thumb:
                    cover_thumb = thumb

                search_query = f"ytsearch1:{title} {artist_str}".strip()
                playlist_entries.append(
                    PlaylistEntry(
                        id=track_id,
                        title=title,
                        author=artist_str,
                        duration_seconds=duration,
                        url=search_query,
                        thumbnail_url=thumb
                    )
                )

        if not playlist_entries:
            raise ValueError("Nenhuma faixa encontrada na playlist.")

        total_duration = sum(p.duration_seconds for p in playlist_entries)
        return VideoInfo(
            id=playlist_id,
            title="Playlist do Spotify",
            author="Vários Artistas",
            duration_seconds=total_duration,
            thumbnail_url=cover_thumb,
            raw_description="",
            is_playlist=True,
            playlist_entries=playlist_entries,
            suggested_tracks=[]
        )

    def _extract_album_fast(self, url: str) -> VideoInfo:
        from spotapi import Public
        album_id = _extract_id_from_url(url, "album")
        if not album_id:
            raise ValueError("ID do álbum não encontrado na URL.")

        playlist_entries: List[PlaylistEntry] = []
        album_title = "Álbum do Spotify"
        album_artist = "Vários Artistas"
        cover_thumb = ""

        for page in Public.album_info(album_id):
            items = page if isinstance(page, list) else page.get("items", [])
            for item in items:
                track = item.get("track", {}) if isinstance(item, dict) else {}
                if not track:
                    continue

                title = track.get("name") or "Faixa sem título"
                duration_ms = track.get("duration", {}).get("totalMilliseconds") or track.get("trackDuration", {}).get("totalMilliseconds") or 0
                duration = int(duration_ms // 1000)
                uri = track.get("uri", "")
                track_id = uri.split(":")[-1] if uri else f"album-track-{len(playlist_entries)+1}"

                artists = [a.get("profile", {}).get("name") for a in track.get("artists", {}).get("items", []) if a.get("profile", {}).get("name")]
                artist_str = ", ".join(artists) or album_artist

                search_query = f"ytsearch1:{title} {artist_str}".strip()
                playlist_entries.append(
                    PlaylistEntry(
                        id=track_id,
                        title=title,
                        author=artist_str,
                        duration_seconds=duration,
                        url=search_query,
                        thumbnail_url=cover_thumb
                    )
                )

        if not playlist_entries:
            raise ValueError("Nenhuma faixa encontrada no álbum.")

        total_duration = sum(p.duration_seconds for p in playlist_entries)
        return VideoInfo(
            id=album_id,
            title=album_title,
            author=album_artist,
            duration_seconds=total_duration,
            thumbnail_url=cover_thumb,
            raw_description="",
            is_playlist=True,
            playlist_entries=playlist_entries,
            suggested_tracks=[]
        )

    def _extract_with_spotdl(self, clean_url: str) -> VideoInfo:
        from spotdl import parse_query
        try:
            songs = parse_query([clean_url], threads=4)
        except Exception as e:
            raise ValueError(f"Não foi possível obter metadados do Spotify: {str(e)}")

        if not songs:
            raise ValueError("Nenhuma música encontrada para o link do Spotify informado.")

        is_explicit_playlist = "/playlist/" in clean_url or "/album/" in clean_url
        if not is_explicit_playlist and len(songs) == 1:
            song = songs[0]
            artist_name = ", ".join(song.artists) if song.artists else (song.artist or "Artista Desconhecido")
            return VideoInfo(
                id=song.song_id or "spotify-track",
                title=song.name or "Música do Spotify",
                author=artist_name,
                duration_seconds=int(song.duration or 0),
                thumbnail_url=song.cover_url or "",
                raw_description="",
                is_playlist=False,
                playlist_entries=[],
                suggested_tracks=[]
            )

        playlist_entries: List[PlaylistEntry] = []
        for idx, s in enumerate(songs):
            artist_name = ", ".join(s.artists) if s.artists else (s.artist or "Artista Desconhecido")
            search_query = f"ytsearch1:{s.name} {s.artist or ''}".strip()
            playlist_entries.append(
                PlaylistEntry(
                    id=s.song_id or f"spotify-track-{idx + 1}",
                    title=s.name or f"Faixa {idx + 1}",
                    author=artist_name,
                    duration_seconds=int(s.duration or 0),
                    url=search_query,
                    thumbnail_url=s.cover_url or ""
                )
            )

        first_song = songs[0]
        cover_thumb = first_song.cover_url or (playlist_entries[0].thumbnail_url if playlist_entries else "")
        total_duration = sum(p.duration_seconds for p in playlist_entries)

        if "/album/" in clean_url:
            album_title = first_song.album_name or "Álbum do Spotify"
            album_author = first_song.album_artist or first_song.artist or "Vários Artistas"
        else:
            album_title = first_song.list_name or "Playlist do Spotify"
            album_author = first_song.artist or "Vários Artistas"

        return VideoInfo(
            id=first_song.album_id or "spotify-playlist",
            title=album_title,
            author=album_author,
            duration_seconds=total_duration,
            thumbnail_url=cover_thumb,
            raw_description="",
            is_playlist=True,
            playlist_entries=playlist_entries,
            suggested_tracks=[]
        )
