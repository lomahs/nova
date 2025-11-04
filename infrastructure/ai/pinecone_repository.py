import itertools
from dataclasses import asdict
from datetime import date, datetime

from langchain_openai import OpenAIEmbeddings
from pinecone import ServerlessSpec, Pinecone

from infrastructure.config.settings import PINECONE_API_KEY, PINECONE_INDEX_NAME, EMBEDDING_API_KEY, EMBEDDING_MODEL, API_ENDPOINT


def chunks(vectors, batch_size = 100):
    it = iter(vectors)
    chunk = tuple(itertools.islice(it, batch_size))
    while chunk:
        yield chunk
        chunk = tuple(itertools.islice(it, batch_size))


class PineconeRepository:
    def __init__(self):
        self.api_key = PINECONE_API_KEY
        self.index_name = PINECONE_INDEX_NAME
        self.pc = Pinecone(api_key=self.api_key, pool_threads=30)

        # Create index if not exists
        if self.index_name not in [i["name"] for i in self.pc.list_indexes()]:
            self.pc.create_index(
                name=self.index_name,
                dimension=1536,
                metric="cosine", # using dotproduct give identical results
                spec=ServerlessSpec(cloud="aws", region="us-east-1")
            )

        self.index = self.pc.Index(self.index_name, pool_threads=30)
        self.embedder = OpenAIEmbeddings(model=EMBEDDING_MODEL, api_key=EMBEDDING_API_KEY, base_url=API_ENDPOINT)

    def upsert_tasks(self, tasks):
        """Convert list of Task objects into embeddings and upload to Pinecone."""
        vectors = []
        for t in tasks:
            text = t.__str__()
            embedding = self.embedder.embed_query(text)
            metadata=asdict(t)
            # Convert any date fields to strings for JSON compatibility
            for key, value in metadata.items():
                if isinstance(value, (date, datetime)):
                    metadata[key] = value.isoformat()

            vectors.append((t.id, embedding, metadata))
        #
        # with self.index as index:
        #     async_results = [index.upsert(vectors=chunk, async_req=True) for chunk in chunks(vectors, 100)]

        self.index.upsert(vectors=vectors)
        print(f"✅ Uploaded {len(vectors)} tasks to Pinecone index '{self.index_name}'")

    def query_similar_tasks(self, query, top_k=5):
        """Find tasks semantically similar to a query string."""
        query_embedding = self.embedder.embed_query(query)
        results = self.index.query(vector=query_embedding, top_k=top_k, include_metadata=True)
        return results["matches"]

    def query_all_tasks(self, member_name: str = None):
        """Fetch tasks with plan_end_date equal to today."""
        today_str = date.today().isoformat()
        results = self.index.query(
            vector=[0]*1536,  # Dummy vector for filtering
            include_metadata=True,
            top_k=100,
        )
        return results["matches"]