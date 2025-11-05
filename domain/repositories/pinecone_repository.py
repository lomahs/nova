from abc import ABC, abstractmethod
from typing import List, Dict

class PineconeRepository(ABC):
    """Interface for managing task embeddings in Pinecone."""

    @abstractmethod
    def upsert_embeddings(self, vectors: List[Dict]) -> None:
        """Insert or update embeddings (vector + metadata)."""
        pass

    @abstractmethod
    def search_similar(self, query_text: str, top_k: int = 5) -> List[Dict]:
        """Search for semantically similar tasks."""
        pass

    @abstractmethod
    def delete_by_id(self, task_id: str) -> None:
        """Delete embedding by task ID."""
        pass