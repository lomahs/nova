from abc import ABC, abstractmethod
from typing import List

from domain.entities.task import Task


class Neo4jRepository(ABC):
    """Interface for Neo4j operations (graph-based)."""

    @abstractmethod
    def get_task_dependencies(self, task_id: str) -> List[Task]:
        """Return tasks that are dependencies of the given task."""
        pass

    @abstractmethod
    def find_delayed_tasks(self) -> List[Task]:
        """Find all delayed tasks based on due date and status."""
        pass

    @abstractmethod
    def get_tasks_by_pic(self, pic_name: str) -> List[Task]:
        """Return all tasks assigned to a specific PIC."""
        pass

    @abstractmethod
    def upsert_tasks(self, tasks: List[Task]) -> None:
        """Insert or update a list of tasks."""
        pass

    @abstractmethod
    def get_task_by_id(self, task_id: str) -> Task:
        """Retrieve a single task by its ID."""
        pass

    @abstractmethod
    def get_task_by_date(self, date: str) -> List[Task]:
        """Retrieve tasks by due date."""
        pass

    @abstractmethod
    def list_tasks(self) -> List[Task]:
        """Return all tasks."""
        pass