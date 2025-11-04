from infrastructure.config.settings import CSV_FILE_PATH
from infrastructure.persistence.csv_repository import CSVRepository
from infrastructure.ai.pinecone_repository import PineconeRepository

# init vector store with csv persistence
repo = CSVRepository(CSV_FILE_PATH)
tasks = repo.get_all_tasks()

pine_repo = PineconeRepository()
pine_repo.upsert_tasks(tasks)