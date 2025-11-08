import json
import os

from langchain_core.messages import AIMessage, HumanMessage
from langchain_openai import ChatOpenAI
from langgraph.checkpoint.memory import MemorySaver
from langgraph.constants import END
from langgraph.graph import MessagesState, StateGraph
from langgraph.prebuilt import ToolNode

from infrastructure.ai.tool_collections import tool_search_tasks
from infrastructure.config.settings import LLM_MODEL, LLM_API_KEY, API_ENDPOINT, CONVERSATION_HISTORY_FILE_PATH

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

        workflow.set_entry_point("chatbot")

        workflow.add_conditional_edges("chatbot", self.should_continue, ["tools", END])
        workflow.add_edge("tools", "chatbot")

        memory = MemorySaver()
        self.app = workflow.compile(checkpointer=memory)

        self.conversation_history = []
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

        # Check if the last message includes tool calls
        if last_message.tool_calls:
            return "tools"

        # End the conversation if no tool calls are present
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
    async def multi_tool_output(self, query: str):
        user_message = HumanMessage(content=query)

        self.conversation_history.append(user_message)
        inputs = {"messages": self.conversation_history}

        # Generator for streaming tokens

        response_content = ""
        async for msg in self.app.astream(inputs, config, stream_mode="messages"):
            if hasattr(msg, "content") and msg.content and isinstance(msg, AIMessage):
                response_content += msg.content
                yield msg.content

        # Append AI response to conversation history and save
        self.conversation_history.append(AIMessage(content=response_content))
        # self.save_history()


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
