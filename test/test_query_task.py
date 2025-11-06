from infrastructure.database.neo4j_repository import connect_neo4j_vector

if __name__ == "__main__":
    neo4j_vector = connect_neo4j_vector()
    # neo4j_vector.create_new_keyword_index()
    # result1 = neo4j_vector.similarity_search("Task of Bao?")
    # print(f"Found {len(result1)} results.")
    # for i, doc in enumerate(result1):
    #     print(f"Result {i}: ")
    #     print("     Metadata:", doc.metadata)
    #
    # result2 = neo4j_vector.similarity_search_with_score("Task of Bao?")
    # print(f"Found {len(result1)} results.")
    # for doc, score in result2:
    #     print("     Metadata:", doc.metadata)
    #     print("     Score:", score)

    store = neo4j_vector.as_retriever()
    result = store.invoke("Task of Bao?")
    for i, doc in enumerate(result):
        print(f"Result {i}: ")
        print("     Metadata:", doc.metadata)