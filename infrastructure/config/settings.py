import os

from dotenv import load_dotenv
from langchain_openai import OpenAIEmbeddings, ChatOpenAI

load_dotenv()

API_ENDPOINT = os.getenv("API_ENDPOINT")

LLM_MODEL = os.getenv("LLM_MODEL")
LLM_API_KEY = os.getenv("LLM_API_KEY")

EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL")
EMBEDDING_API_KEY = os.getenv("EMBEDDING_API_KEY")

CSV_FILE_PATH = os.getenv("CSV_FILE_PATH", "../../data/sample.csv")

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME")

NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USERNAME = os.getenv("NEO4J_USERNAME")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

CONVERSATION_HISTORY_FOLDER_PATH = os.getenv("CONVERSATION_HISTORY_FOLDER_PATH")
CONVERSATION_HISTORY_FILE_PATH = CONVERSATION_HISTORY_FOLDER_PATH + "/conversation_history.json"

embeddings = OpenAIEmbeddings(base_url=API_ENDPOINT, api_key=EMBEDDING_API_KEY, model=EMBEDDING_MODEL)

llm = ChatOpenAI(model=LLM_MODEL, api_key=LLM_API_KEY, base_url=API_ENDPOINT, temperature=0)