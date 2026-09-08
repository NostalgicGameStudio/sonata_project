from django.test import TestCase
from core.services.timestamp_parser import (
    RegexTimestampParser,
    timestamp_to_seconds,
    seconds_to_timestamp,
)


class TimestampParserTest(TestCase):
    def setUp(self):
        self.parser = RegexTimestampParser()

    def test_timestamp_conversions(self):
        # Conversão MM:SS
        self.assertEqual(timestamp_to_seconds("04:02"), 242)
        self.assertEqual(seconds_to_timestamp(242), "04:02")

        # Conversão HH:MM:SS
        self.assertEqual(timestamp_to_seconds("01:15:30"), 4530)
        self.assertEqual(seconds_to_timestamp(4530), "1:15:30")

        # Com colchetes e parênteses
        self.assertEqual(timestamp_to_seconds("[00:45]"), 45)
        self.assertEqual(timestamp_to_seconds("(02:10)"), 130)

    def test_parse_various_patterns(self):
        sample_description = """
        Aproveite esta playlist relaxante de Lofi!
        
        00:00 - First Morning Coffee
        [02:45] Rainy Afternoon
        (05:10) Sunset Vibes
        Night Walk - 08:30
        05. Midnight Study - 12:15
        
        Obrigado por ouvir!
        """

        tracks = self.parser.parse(sample_description, total_duration_seconds=900)

        self.assertEqual(len(tracks), 5)

        # Faixa 1: 00:00 - First Morning Coffee
        self.assertEqual(tracks[0].index, 1)
        self.assertEqual(tracks[0].title, "First Morning Coffee")
        self.assertEqual(tracks[0].start_time, "00:00")
        self.assertEqual(tracks[0].start_seconds, 0)
        self.assertEqual(tracks[0].end_time, "02:45")
        self.assertEqual(tracks[0].end_seconds, 165)

        # Faixa 2: [02:45] Rainy Afternoon
        self.assertEqual(tracks[1].index, 2)
        self.assertEqual(tracks[1].title, "Rainy Afternoon")
        self.assertEqual(tracks[1].start_time, "02:45")
        self.assertEqual(tracks[1].end_time, "05:10")

        # Faixa 3: (05:10) Sunset Vibes
        self.assertEqual(tracks[2].index, 3)
        self.assertEqual(tracks[2].title, "Sunset Vibes")
        self.assertEqual(tracks[2].start_time, "05:10")
        self.assertEqual(tracks[2].end_time, "08:30")

        # Faixa 4: Night Walk - 08:30 (formato invertido)
        self.assertEqual(tracks[3].index, 4)
        self.assertEqual(tracks[3].title, "Night Walk")
        self.assertEqual(tracks[3].start_time, "08:30")
        self.assertEqual(tracks[3].end_time, "12:15")

        # Faixa 5: 05. Midnight Study - 12:15 (com prefixo e término na duração total)
        self.assertEqual(tracks[4].index, 5)
        self.assertEqual(tracks[4].title, "Midnight Study")
        self.assertEqual(tracks[4].start_time, "12:15")
        self.assertEqual(tracks[4].end_time, "15:00")  # 900s = 15:00

    def test_parse_empty_or_invalid_text(self):
        self.assertEqual(self.parser.parse(""), [])
        self.assertEqual(self.parser.parse("Apenas texto sem nenhum timestamp"), [])
