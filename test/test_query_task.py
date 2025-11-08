from infrastructure.ai.ai_agent import AIAgent
from infrastructure.database.neo4j_repository import connect_neo4j_vector

neo4j_vector = connect_neo4j_vector()

if __name__ == "__main__":    # neo4j_vector.create_new_keyword_index()
    ai_agent = AIAgent()
    while True:
        try:
            user_input = input("You: ")
            for output in ai_agent.multi_tool_output(user_input):
                pass  # or handle output if needed
        except Exception as e:
            print(e)