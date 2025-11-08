import asyncio
import json

from langchain_core.messages import AIMessage, HumanMessage, AIMessageChunk, SystemMessage, ToolMessage
from langchain_openai import ChatOpenAI
from langgraph.checkpoint.memory import MemorySaver
from langgraph.constants import END
from langgraph.graph import MessagesState, StateGraph
from langgraph.prebuilt import ToolNode

from domain.services.external_service import send_tasks
from infrastructure.ai.tool_collections import tool_search_tasks
from infrastructure.config.settings import LLM_MODEL, LLM_API_KEY, API_ENDPOINT

config = {"configurable": {"thread_id": "single_session_memory"}}


class AIAgent:
    def __init__(self):
        llm = ChatOpenAI(model=LLM_MODEL, api_key=LLM_API_KEY, base_url=API_ENDPOINT, temperature=0)

        tools = [tool_search_tasks]

        tool_node = ToolNode(tools)
        self.model_with_tools = llm.bind_tools(tools)

        workflow = StateGraph(MessagesState)

        workflow.add_node("chatbot", self.call_model)
        workflow.add_node("tools", tool_node)
        workflow.add_node("handle_search_tasks", self.handle_search_tasks)

        workflow.set_entry_point("chatbot")

        workflow.add_conditional_edges("chatbot", self.should_continue, ["tools", END])
        workflow.add_conditional_edges("tools", self.tools_next_node, ["handle_search_tasks", "chatbot"])

        workflow.add_edge("handle_search_tasks", "chatbot")

        memory = MemorySaver()
        self.app = workflow.compile(checkpointer=memory)

        self.conversation_history = []
        sys_message = SystemMessage(content="""
        You are a intelligence project assistant who will help to manage tasks like filter by PIC, date or update task.
        Answer the user query below in **Markdown format**. Use headings, lists, bold, code blocks, etc. wherever appropriate.
        """
                                    )
        self.conversation_history.append(sys_message)
        # self.conversation_history = self.load_history()

    # def save_history(self):
    #     with open(CONVERSATION_HISTORY_FILE_PATH, "w") as f:
    #         json.dump([m.model_dump() for m in self.conversation_history], f)
    #
    # def load_history(self):
    #     if os.path.exists(CONVERSATION_HISTORY_FILE_PATH):
    #         with open(CONVERSATION_HISTORY_FILE_PATH, "r") as f:
    #             data = json.load(f)
    #             return [HumanMessage(**m) if m["type"] == "human" else AIMessage(**m) for m in data]
    #     return []

    # Use MessagesState to define the state of the function
    @staticmethod
    def should_continue(state: MessagesState):
        # Get the last message from the state
        last_message = state["messages"][-1]

        if last_message.tool_calls:
            return "tools"  # fallback for other tools

        # End the conversation if no tool calls are present
        return END

    @staticmethod
    def tools_next_node(state: MessagesState):
        """
        Decide which node to go after executing a tool.
        """
        last_message = state["messages"][-1]

        if isinstance(last_message, ToolMessage):
            executed_tool_name = last_message.name

            if executed_tool_name == "search_tasks":
                return "handle_search_tasks"  # call special handler
            else:
                return "chatbot"  # other tools, return to chatbot

        return END

    # Extract the last message from the history
    def call_model(self, state: MessagesState):
        last_message = state["messages"][-1]

        # If the last message has tool calls, return the tool's response
        if isinstance(last_message, AIMessage) and last_message.tool_calls:
            # Return only the messages from the tool call
            return {"messages": [AIMessage(content=last_message.tool_calls[0]["response"])]}

        # Otherwise, proceed with a regular LLM response
        return {"messages": [self.model_with_tools.invoke(state["messages"])]}

    # Create input message with the user's query
    async def multi_tool_output(self, query):
        user_message = HumanMessage(content=query)

        self.conversation_history.append(user_message)
        inputs = {"messages": self.conversation_history}

        response_content = ""
        # Stream messages correctly
        # Example: adapt sync streaming source into async loop
        loop = asyncio.get_event_loop()

        for event in await loop.run_in_executor(None, lambda: list(
                self.app.stream(inputs, config, stream_mode="messages"))):
            msg = event[0] if isinstance(event, tuple) else event
            if isinstance(msg, AIMessageChunk) and msg.content:
                response_content += msg.content
                yield msg.content

        # Append AI response to conversation history and save
        self.conversation_history.append(AIMessage(content=response_content))
        # self.save_history()

    @staticmethod
    def handle_search_tasks(state: MessagesState):
        search_results = []
        message_list = state["messages"]

        # Extract the task list from the tool result
        for i in reversed(range(len(message_list))):
            if isinstance(message_list[i], ToolMessage):
                list_dict = {}
                if message_list[i].content:
                    list_dict = json.loads(message_list[i].content)
                # list_dto = [Task(**item) for item in list_dict]
                for task in list_dict:
                    search_results.append(task)
            if isinstance(message_list[i], AIMessage):
                break

        # Example: call another API to enrich/process tasks
        send_tasks(search_results)

    def normalize_user_context(self, state: dict):
        """Convert 'my' pronouns into user's actual name context."""
        last_message = state["messages"][-1]
        content = last_message.content

        user_name = getattr(self, "current_user_name", "UnknownUser")
        normalized = content

        # Simple semantic grounding
        if " my " in f" {content.lower()} ":
            normalized = content.replace(" my ", f" {user_name}'s ")
        if content.lower().startswith("my "):
            normalized = normalized.replace("my ", f"{user_name}'s ", 1)

        print(f"[Normalize] '{content}' → '{normalized}'")

        # Replace the message with normalized version
        state["messages"][-1].content = normalized
        return {"messages": state["messages"]}
