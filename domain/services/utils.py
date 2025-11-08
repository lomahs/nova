import math
from datetime import date, timedelta, datetime


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