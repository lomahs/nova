from langchain_core.documents import Document
from langchain_neo4j import Neo4jVector
from neo4j_graphrag.types import SearchType

from domain.entities.task import Task
from domain.services.excel_reader import ExcelReader
from infrastructure.config.settings import embeddings, NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD


def connect_neo4j_vector() -> Neo4jVector:
    # 1. Try to connect and check existing index
    try:
        # Use from_existing_index to see if vector index exists
        vector_store = Neo4jVector.from_existing_index(
            embedding=embeddings,
            url=NEO4J_URI,
            username=NEO4J_USERNAME,
            password=NEO4J_PASSWORD,
            index_name="task_vector",
            search_type=SearchType.HYBRID,
            keyword_index_name="keyword"
        )
        print(f"Connected to existing vector index 'NOVA'.")
    except ValueError as e:
        print(f"Vector index 'NOVA' not found or error: {e}")
        # Create new index via from_texts or from_documents
        vector_store = Neo4jVector.from_documents(
            documents=[],
            embedding=embeddings,
            url=NEO4J_URI,
            username=NEO4J_USERNAME,
            password=NEO4J_PASSWORD,
            index_name="task_vector",
            node_label="Task",  # You can name it as you like
            text_node_property="text",
            embedding_node_property="embedding",
            search_type=SearchType.HYBRID,
            keyword_index_name="keyword"
        )
        print(f"Created new vector index 'NOVA' with node_label 'Task'.")

    return vector_store


def insert_tasks_to_neo4j(neo4j_vector: Neo4jVector, tasks: list[Task]):
    documents = []
    for t in tasks:
        documents.append(
            Document(
                page_content=str(t),
                metadata={
                    "task": t.task,
                    "pic": t.pic,
                    "status": t.status,
                    "plan_effort": t.plan_effort,
                    "plan_start_date": t.plan_start_date.isoformat() if t.plan_start_date else None,
                    "plan_end_date": t.plan_end_date.isoformat() if t.plan_end_date else None,
                    "actual_effort": t.actual_effort,
                    "actual_start_date": t.actual_start_date.isoformat() if t.actual_start_date else None,
                    "actual_end_date": t.actual_end_date.isoformat() if t.actual_end_date else None,
                    "progress": t.progress,
                    "issues": t.issues,
                    "remark": t.remark,
                }
            )
        )
    neo4j_vector.add_documents(documents)
    print(f"✅ Inserted {len(documents)} tasks into Neo4j vector index.")

def import_excel_to_neo4j_vector(file_path):
    tasks = ExcelReader.read_tasks(file_path)
    neo4j_vector = connect_neo4j_vector()
    insert_tasks_to_neo4j(neo4j_vector, tasks)