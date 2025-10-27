from config.settings import CSV_FILE_PATH
from core.use_cases.get_today_tasks import GetTodayTasks
from infrastructure.data.csv_repository import CSVRepository
from interfaces.agents.ai_agent import AIAgent


def main():
    agent = AIAgent()

    print("🤖 AI Project Manager Agent Ready!")

    while True:
        query = input("You: ")
        if query.lower() in ["exit", "quit"]:
            break
        response = agent.chat(query)
        print(f"AI: {response}\n")

if __name__ == "__main__":
    main()