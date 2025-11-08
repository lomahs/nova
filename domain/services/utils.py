import math
from datetime import date, timedelta, datetime
from typing import List


def normalize_date_list(dates: List[str]) -> List[str]:
    """Convert date strings like 'yesterday', 'today' or ISO strings to 'YYYY-MM-DD'."""
    normalized = []
    for d in dates:
        if d.lower() == "today":
            normalized.append(date.today().isoformat())
        elif d.lower() == "yesterday":
            normalized.append((date.today() - timedelta(days=1)).isoformat())
        else:
            normalized.append(d)  # assume already ISO string
    return normalized

def normalize_date(value: str) -> str:
    """Convert relative dates to ISO strings."""
    if not value:
        return None
    value = value.lower()
    today = date.today()
    if value == "today":
        return str(today)
    if value == "tomorrow":
        return str(today + timedelta(days=1))
    return value

def sanitize_floats(data: dict):
    for key, value in data.items():
        if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
            data[key] = None
    return data

def normalize_dates(data: dict):
    for key, value in data.items():
        # Neo4j's temporal types often come as dicts or strings
        if isinstance(value, dict) and "year" in value:
            # Example: {'year': 2025, 'month': 11, 'day': 8}
            data[key] = date(value["year"], value["month"], value["day"])
        elif isinstance(value, datetime):
            data[key] = value.date()
        elif isinstance(value, str) and "T" in value:
            # Parse ISO string (2025-11-08T00:00:00Z)
            data[key] = datetime.fromisoformat(value.replace("Z", "+00:00")).date()
    return data