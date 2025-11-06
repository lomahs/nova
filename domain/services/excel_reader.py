from datetime import date
from typing import List

import pandas as pd

from domain.entities.task import Task


class ExcelReader:
    def __init__(self, file_path: str, project_name: str):
        self.file_path = file_path
        self.project_name = project_name

    @staticmethod
    def read_tasks(file_path: str, sheet_name: str = "Plan") -> List[Task]:
        df = pd.read_excel(file_path, sheet_name=sheet_name)
        tasks: List[Task] = []

        for _, row in df.iterrows():
            # Safely parse date and issue list
            def safe_date(value):
                if pd.isna(value): return None
                if isinstance(value, date): return value
                return pd.to_datetime(value).date

            issues = []
            if isinstance(row.get("Issues"), str):
                issues = [i.strip() for i in row["Issues"].split(",") if i.strip()]

            task = Task(
                task=row.get("Task", ""),
                pic=row.get("PIC", ""),
                status=row.get("Status", ""),
                plan_effort=row.get("Plan Effort"),
                plan_start_date=safe_date(row.get("Plan Start Date")),
                plan_end_date=safe_date(row.get("Plan End Date")),
                actual_effort=row.get("Actual Effort"),
                actual_start_date=safe_date(row.get("Actual Start Date")),
                actual_end_date=safe_date(row.get("Actual End Date")),
                progress=row.get("Progress"),
                issues=issues,
                remark=row.get("Remark", ""),
            )
            tasks.append(task)
        return tasks