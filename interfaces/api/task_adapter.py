import asyncio
from typing import AsyncGenerator

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from starlette.responses import StreamingResponse

from domain.entities.task import Task
from domain.services.utils import sanitize_floats
from infrastructure.ai.ai_agent import AIAgent
from infrastructure.database.neo4j_repository import search_tasks

router = APIRouter()

@router.get("/search", response_model=list[Task])
def search_tasks_api(pic: str = None, plan_start_date: str = None, status: str = None):
    result = search_tasks(pic, plan_start_date, status)

    return [Task(**sanitize_floats(record)) for record in result]


@router.websocket("/ws/chat")
async def chat_socket(websocket: WebSocket):
    await websocket.accept()

    agent = AIAgent()

    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()

            # Stream response from agent
            async for chunk in agent.multi_tool_output(data):  # assume agent supports async streaming
                await websocket.send_text(chunk)

            # Optionally mark end of message
            await websocket.send_text("[END]")

    except WebSocketDisconnect:
        print("Client disconnected")

@router.post("/chat/stream")
async def stream_chat(req: str) -> StreamingResponse:
    ai_agent = AIAgent()

    """
    Streams AI output token-by-token as server-sent chunks.
    """
    async def event_stream() -> AsyncGenerator[str, None]:
        loop = asyncio.get_event_loop()

        for chunk in await loop.run_in_executor(None, lambda: list(ai_agent.multi_tool_output(req))):
        # flush each chunk as it's generated
            print(chunk, end="", flush=True)
            yield chunk

    return StreamingResponse(event_stream(), media_type="text/plain")