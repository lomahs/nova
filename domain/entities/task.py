import math
from dataclasses import dataclass
from datetime import date, datetime
from typing import Optional, List

@dataclass
class Task:
    task: str
    pic: str
    status: str
    issues: List[str]
    remark: str
    progress: Optional[float] = 0
    plan_effort: Optional[float] = 0
    plan_start_date: Optional[date] = None
    plan_end_date: Optional[date] = None
    actual_effort: Optional[float] = 0
    actual_start_date: Optional[date] = None
    actual_end_date: Optional[date] = None

    def __str__(self):
        """String form for embedding / semantic indexing"""
        return (
            f"Task: {self.task}\n"
            f"PIC: {self.pic}\n"
            f"Status: {self.status}\n"
            f"Plan Effort: {self.plan_effort}, Actual Effort: {self.actual_effort}\n"
            f"Plan Start: {self.plan_start_date}, Plan End: {self.plan_end_date}\n"
            f"Actual Start: {self.actual_start_date}, Actual End: {self.actual_end_date}\n"
            f"Progress: {self.progress}%\n"
            f"Issues: {', '.join(self.issues) if self.issues else 'None'}\n"
            f"Remark: {self.remark}"
        )

    def to_dict(self):
        def format_date(d):
            if isinstance(d, date):
                return d.isoformat()
            return d  # already string or None

        return {
            "task": self.task,
            "pic": self.pic,
            "status": self.status,
            "issues": self.issues,
            "remark": self.remark,
            "progress": self.progress,
            "plan_effort": self.plan_effort,
            "plan_start_date": format_date(self.plan_start_date),
            "plan_end_date": format_date(self.plan_end_date),
            "actual_effort": self.actual_effort,
            "actual_start_date": format_date(self.actual_start_date),
            "actual_end_date": format_date(self.actual_end_date),
        }

    def safe_float(val):
        if val is None or (isinstance(val, float) and math.isnan(val)):
            return None
        return val

    def parse_date(val):
        if val is None:
            return None
        return datetime.fromisoformat(val).date()