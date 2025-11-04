from infrastructure.ai.ai_agent import AIAgent


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