from langchain.agents import create_react_agent, AgentExecutor
from langchain_core.prompts import PromptTemplate
from langchain_core.tools import Tool, tool
from langchain_openai import ChatOpenAI

from config.settings import LLM_MODEL, LLM_KEY, API_ENDPOINT
from core.domain.Task import build_task_from_metadata
from infrastructure.vertor_store.pinecone_repository import PineconeRepository


class AIAgent:
    def __init__(self):
        llm = ChatOpenAI(model=LLM_MODEL, api_key=LLM_KEY, base_url=API_ENDPOINT, temperature=0)

        tools = [
            Tool(
                name="today_task_tool",
                func=today_task_tool,
                description="List today's tasks by PIC"
            )
        ]

        template = '''Answer the following questions as best you can. You have access to the following tools:

        {tools}

        Use the following format:

        Question: the input question you must answer
        Thought: you should always think about what to do
        Action: the action to take, should be one of [{tool_names}]
        Action Input: the input to the action
        Observation: the result of the action
        ... (this Thought/Action/Action Input/Observation can repeat N times)
        Thought: I now know the final answer
        Final Answer: the final answer to the original input question

        Begin!

        Question: {input}
        Thought:{agent_scratchpad}'''

        self.agent = create_react_agent(llm=llm, tools=tools, prompt=PromptTemplate.from_template(template))
        # Wrap it into an executor (to manage inputs/outputs correctly)
        self.agent_executor = AgentExecutor(agent=self.agent, tools=tools, verbose=False, max_iterations=3, early_stopping_method="force")

    def chat(self, query: str):
        response = self.agent_executor.invoke({"input": query})
        return response["output"]


@tool
def today_task_tool(member_name: str = None):
    """List today’s project tasks. Optionally specify member name."""

    pine_repo = PineconeRepository()
    tasks = pine_repo.query_all_tasks(member_name)
    task_list = []
    if not tasks:
        return "No tasks for today."
    else:
        for t in tasks:
            task = t.metadata
            task_list.append(build_task_from_metadata(task))
    return task_list