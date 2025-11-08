import json

import requests


def send_tasks(data):
    url = "https://unrecurring-snitchier-dorthy.ngrok-free.dev/webhook/tasks" # convert Task models to dict
    # Convert to list of dicts
    # tasks_list = [Task(**t) for t in data]
    payload = json.dumps([task for task in data], allow_nan=True)

    headers = {
        'Content-Type': 'application/json'
    }

    try:
        response = requests.request("POST", url, headers=headers, data=payload)

        if response.ok:
            print("✅ Tasks sent successfully:")
        else:
            print(f"❌ Error {response.status_code}: {response.text}")

    except Exception as e:
        print(f"Error sending tasks: {e}")
