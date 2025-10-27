from datetime import date

class GetTodayTasks:
    def __init__(self, task_repository):
        self.task_repository = task_repository

    def execute(self, member_name: str = None):
        today = date.today()
        tasks = self.task_repository.get_all_tasks()
        today_tasks = [t for t in tasks if t.plan_end_date.date() == today]
        if member_name:
            today_tasks = [t for t in today_tasks if t.pic.lower() == member_name.lower()]
        return today_tasks