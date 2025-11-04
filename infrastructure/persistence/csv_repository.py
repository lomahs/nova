import pandas as pd

from domain.entities.task import Task


class CSVRepository:
    def __init__(self, file_path: str):
        self.file_path = file_path

    def get_all_tasks(self) -> list[Task]:
        df = pd.read_csv(self.file_path)
        tasks = []
        for _, row in df.iterrows():
            tasks.append(Task(
                id=str(row["ID"]),
                name=row["Task"],
                pic=row["PIC"],
                reviewer=row["Reviewer"],
                status=row["Status"],
                plan_start_date=pd.to_datetime(row["Plan Start Date"]),
                plan_end_date=pd.to_datetime(row["Plan End Date"]),
                actual_start_date=pd.to_datetime(row["Actual Start Date"]),
                actual_end_date=pd.to_datetime(row["Actual End Date"]),
                progress=str(row["Progress"]),
                effort=float(row["Effort (h)"])
            ))
        return tasks