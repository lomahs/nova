import os
from dotenv import load_dotenv

load_dotenv()

API_ENDPOINT = os.getenv("API_ENDPOINT")

LLM_MODEL = os.getenv("LLM_MODEL")
LLM_API_KEY = os.getenv("LLM_API_KEY")

EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL")
EMBEDDING_API_KEY = os.getenv("EMBEDDING_API_KEY")

CSV_FILE_PATH = os.getenv("CSV_FILE_PATH", "../../data/sample.csv")

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME")