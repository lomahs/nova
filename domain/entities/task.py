import datetime
from dataclasses import dataclass


from dataclasses import dataclass
from datetime import date
from typing import Optional, List

@dataclass
class Task:
    task: str
    pic: str
    status: str
    plan_effort: Optional[float]
    plan_start_date: Optional[date]
    plan_end_date: Optional[date]
    actual_effort: Optional[float]
    actual_start_date: Optional[date]
    actual_end_date: Optional[date]
    progress: Optional[float]
    issues: List[str]
    remark: str

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