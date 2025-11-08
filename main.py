from fastapi import FastAPI

from interfaces.api.task_adapter import router

app = FastAPI(title="Task Pilot API", version="1.0.0")

# Include routes
app.include_router(router, prefix="/tasks", tags=["Tasks"])

@app.get("/")
def root():
    return {"message": "Welcome to Task Pilot API"}