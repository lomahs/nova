from dataclasses import dataclass
from datetime import date
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