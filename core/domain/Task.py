import datetime
from dataclasses import dataclass


def build_task_from_metadata(metadata):
    return Task(
        id=metadata["id"],
        name=metadata["name"],
        pic=metadata["pic"],
        reviewer=metadata["reviewer"],
        status=metadata["status"],
        plan_start_date=metadata["plan_start_date"],
        plan_end_date=metadata["plan_end_date"],
        actual_start_date=metadata["actual_start_date"],
        actual_end_date=metadata["actual_end_date"],
        effort=metadata["effort"],
        progress=metadata["progress"]
    )


@dataclass
class Task:
    id: str
    name: str
    pic: str
    reviewer: str
    status: str
    plan_start_date: datetime.date
    plan_end_date: datetime.date
    actual_start_date: datetime.date
    actual_end_date: datetime.date
    effort: float
    progress: str

    def __str__(self):
        return f"""
        Task: {self.name}
        PIC: {self.pic}
        Reviewer: {self.reviewer}
        Status: {self.status}
        Plan Start Date: {self.plan_start_date}
        Plan End Date: {self.plan_end_date}
        Actual Start Date: {self.actual_start_date}
        Actual End Date: {self.actual_end_date}
        Effort (h): {self.effort}
        Progress (%): {self.progress}
        """

