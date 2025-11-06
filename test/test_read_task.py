from pathlib import Path

from infrastructure.database.neo4j_repository import import_excel_to_neo4j_vector

if __name__ == "__main__":
    file_path = Path("../data/data.xlsx")

    if file_path.exists():
        print("✅ File exists.")
        import_excel_to_neo4j_vector(
            file_path="../data/data.xlsx"
        )
    else:
        print("❌ File not found.")

