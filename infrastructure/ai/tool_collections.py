from langchain_core.tools import tool

from infrastructure.database.neo4j_repository import search_tasks


@tool("search_tasks", return_direct=True)
def tool_search_tasks(pic: str = None, plan_start_date: str = None, status: str = None):
    """
    Search for tasks in Neo4j by filters.
    Args:
        pic: Optional Person-in-charge.
        plan_start_date: Optional Planned start date
        status: Optional task status.
    """

    result = search_tasks(pic, plan_start_date, status)

    return result
