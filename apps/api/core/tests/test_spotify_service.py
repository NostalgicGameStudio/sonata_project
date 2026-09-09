from unittest.mock import patch, MagicMock
from django.test import TestCase
from core.services.spotify_service import SpotifyMetadataService


class SpotifyMetadataServiceTest(TestCase):
    def setUp(self):
        self.service = SpotifyMetadataService()

    @patch("spotapi.Public.song_info")
    def test_extract_single_track_fast(self, mock_song_info):
        mock_song_info.return_value = {
            "data": {
                "trackUnion": {
                    "name": "Fast Song",
                    "duration": {"totalMilliseconds": 210000},
                    "firstArtist": {"items": [{"profile": {"name": "Fast Artist"}}]},
                    "otherArtists": {"items": []},
                    "albumOfTrack": {
                        "coverArt": {"sources": [{"url": "https://example.com/fast.jpg"}]}
                    }
                }
            }
        }

        info = self.service._extract_sync("https://open.spotify.com/track/abc123")

        self.assertEqual(info.id, "abc123")
        self.assertEqual(info.title, "Fast Song")
        self.assertEqual(info.author, "Fast Artist")
        self.assertEqual(info.duration_seconds, 210)
        self.assertEqual(info.thumbnail_url, "https://example.com/fast.jpg")
        self.assertFalse(info.is_playlist)

    @patch("spotapi.Public.playlist_info")
    def test_extract_playlist_fast(self, mock_playlist_info):
        mock_playlist_info.return_value = [
            {
                "items": [
                    {
                        "itemV2": {
                            "data": {
                                "__typename": "Track",
                                "name": "Track 1",
                                "trackDuration": {"totalMilliseconds": 180000},
                                "uri": "spotify:track:t1",
                                "artists": {"items": [{"profile": {"name": "Artist 1"}}]},
                                "albumOfTrack": {
                                    "coverArt": {"sources": [{"url": "https://example.com/thumb1.jpg"}]}
                                }
                            }
                        }
                    },
                    {
                        "itemV2": {
                            "data": {
                                "__typename": "Track",
                                "name": "Track 2",
                                "trackDuration": {"totalMilliseconds": 200000},
                                "uri": "spotify:track:t2",
                                "artists": {"items": [{"profile": {"name": "Artist 2"}}]},
                                "albumOfTrack": {
                                    "coverArt": {"sources": [{"url": "https://example.com/thumb2.jpg"}]}
                                }
                            }
                        }
                    }
                ]
            }
        ]

        info = self.service._extract_sync("https://open.spotify.com/playlist/pl123")

        self.assertTrue(info.is_playlist)
        self.assertEqual(info.duration_seconds, 380)
        self.assertEqual(len(info.playlist_entries), 2)
        self.assertEqual(info.playlist_entries[0].title, "Track 1")
        self.assertEqual(info.playlist_entries[0].url, "ytsearch1:Track 1 Artist 1")
        self.assertEqual(info.playlist_entries[1].title, "Track 2")
        self.assertEqual(info.playlist_entries[1].url, "ytsearch1:Track 2 Artist 2")

    @patch("spotdl.parse_query")
    @patch("spotapi.Public.song_info", side_effect=Exception("API Error"))
    def test_extract_fallback_spotdl(self, mock_song_info, mock_parse_query):
        mock_song = MagicMock()
        mock_song.song_id = "fallback123"
        mock_song.name = "Fallback Song"
        mock_song.artists = ["Fallback Artist"]
        mock_song.artist = "Fallback Artist"
        mock_song.duration = 150
        mock_song.cover_url = "https://example.com/fallback.jpg"

        mock_parse_query.return_value = [mock_song]

        info = self.service._extract_sync("https://open.spotify.com/track/fallback123")

        self.assertEqual(info.id, "fallback123")
        self.assertEqual(info.title, "Fallback Song")
        self.assertEqual(info.author, "Fallback Artist")
        self.assertEqual(info.duration_seconds, 150)
