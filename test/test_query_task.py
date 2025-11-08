from infrastructure.ai.ai_agent import AIAgent
from infrastructure.database.neo4j_repository import connect_neo4j_vector

neo4j_vector = connect_neo4j_vector()

if __name__ == "__main__":    # neo4j_vector.create_new_keyword_index()
    while True:
        user_input = input("You: ")
        ai_agent = AIAgent()
        result = ai_agent.multi_tool_output(user_input)
    # for i, doc in enumerate(result):
    #     print(f"Result {i}: ")
    #     print("     Metadata:", doc.metadata)