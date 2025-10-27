from config.settings import CSV_FILE_PATH
from infrastructure.data.csv_repository import CSVRepository
from infrastructure.vertor_store.pinecone_repository import PineconeRepository

# init vector store with csv data
repo = CSVRepository(CSV_FILE_PATH)
tasks = repo.get_all_tasks()

pine_repo = PineconeRepository()
pine_repo.upsert_tasks(tasks)