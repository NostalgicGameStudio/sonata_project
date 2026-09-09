import re
from typing import List, Optional
from core.domain.models import Track
from core.services.interfaces import ITimestampParser


def timestamp_to_seconds(time_str: str) -> int:
    """
    Converte marcações de tempo (MM:SS ou HH:MM:SS) em segundos inteiros.
    """
    cleaned = re.sub(r"[\[\]\(\)]", "", time_str.strip())
    parts = [int(p) for p in cleaned.split(":") if p.isdigit()]

    if len(parts) == 3:
        h, m, s = parts
        return h * 3600 + m * 60 + s
    elif len(parts) == 2:
        m, s = parts
        return m * 60 + s
    return 0


def seconds_to_timestamp(seconds: int) -> str:
    """
    Converte segundos inteiros no formato legível MM:SS ou HH:MM:SS.
    """
    total = max(0, int(seconds))
    h = total // 3600
    m = (total % 3600) // 60
    s = total % 60

    if h > 0:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m:02d}:{s:02d}"


class RegexTimestampParser(ITimestampParser):
    """
    Parser baseado em Expressões Regulares com Named Groups.
    """

    TIMESTAMP_PATTERN = re.compile(
        r"^(?:(?:\[|\()?(?P<time1>(?:\d{1,2}:)?\d{2}:\d{2})(?:\]|\))?[\s\-–—:]+(?P<title1>.+)|(?P<title2>.+?)[\s\-–—:]+(?:\[|\()?(?P<time2>(?:\d{1,2}:)?\d{2}:\d{2})(?:\]|\))?)$"
    )

    def parse(self, text: str, total_duration_seconds: Optional[int] = None) -> List[Track]:
        if not text:
            return []

        raw_items = []
        for line in text.splitlines():
            cleaned_line = line.strip()
            if not cleaned_line:
                continue

            match = self.TIMESTAMP_PATTERN.match(cleaned_line)
            if match:
                groups = match.groupdict()
                time_str = groups.get("time1") or groups.get("time2")
                title = groups.get("title1") or groups.get("title2") or ""
                clean_title = re.sub(r"^\d+[\.\-\)]\s*", "", title).strip()

                if time_str and clean_title:
                    seconds = timestamp_to_seconds(time_str)
                    raw_items.append((seconds, time_str, clean_title))

        raw_items.sort(key=lambda item: item[0])

        tracks: List[Track] = []
        total_items = len(raw_items)

        for idx, (secs, time_str, title) in enumerate(raw_items):
            end_seconds: Optional[int] = None
            if idx + 1 < total_items:
                end_seconds = raw_items[idx + 1][0]
            elif total_duration_seconds and total_duration_seconds > secs:
                end_seconds = total_duration_seconds

            end_time = seconds_to_timestamp(end_seconds) if end_seconds is not None else None

            tracks.append(
                Track(
                    index=idx + 1,
                    title=title,
                    start_time=seconds_to_timestamp(secs),
                    start_seconds=secs,
                    end_time=end_time,
                    end_seconds=end_seconds,
                    selected=True
                )
            )

        return tracks
