from flask import Flask, render_template, jsonify, request, Response, session, redirect, url_for, flash
from datetime import date, timedelta
from queue import Queue
import json
import time
import requests

app = Flask(__name__)
# Simple secret for session handling in development. Replace with a secure key for production.
app.secret_key = 'dev_secret_for_local_testing'

# Store received tasks from webhook
webhook_tasks = []


def get_sample_data():
    today = date.today()
    tomorrow = today + timedelta(days=1)
    yesterday = today - timedelta(days=1)

    tasks = [
        {
            "id": 1,
            "task": "Design homepage mockups",
            "pic": "Alex",
            "status": "In Progress",
            "plan_effort": 8.0,
            "plan_start_date": today.isoformat(),
            "plan_end_date": tomorrow.isoformat(),
            "actual_effort": 3.5,
            "actual_start_date": today.isoformat(),
            "actual_end_date": None,
            "progress": 45.0,
            "issues": ["Waiting for brand guidelines"],
            "remark": "Need final color palette approval"
        },
        {
            "id": 2,
            "task": "Develop API endpoint for users",
            "pic": "Jane",
            "status": "To Do",
            "plan_effort": 16.0,
            "plan_start_date": tomorrow.isoformat(),
            "plan_end_date": (tomorrow + timedelta(days=2)).isoformat(),
            "actual_effort": None,
            "actual_start_date": None,
            "actual_end_date": None,
            "progress": 0.0,
            "issues": [],
            "remark": "Documentation first approach"
        },
        {
            "id": 3,
            "task": "Review marketing copy",
            "pic": "Alex",
            "status": "In Review",
            "plan_effort": 4.0,
            "plan_start_date": yesterday.isoformat(),
            "plan_end_date": today.isoformat(),
            "actual_effort": 3.0,
            "actual_start_date": yesterday.isoformat(),
            "actual_end_date": None,
            "progress": 75.0,
            "issues": [],
            "remark": "Pending final review from marketing team"
        },
        {
            "id": 4,
            "task": "Fix login page bug",
            "pic": "Mike",
            "status": "Delayed",
            "plan_effort": 4.0,
            "plan_start_date": yesterday.isoformat(),
            "plan_end_date": yesterday.isoformat(),
            "actual_effort": 6.0,
            "actual_start_date": yesterday.isoformat(),
            "actual_end_date": None,
            "progress": 60.0,
            "issues": ["More complex than initially estimated", "Requires auth service update"],
            "remark": "Additional testing needed"
        },
        {
            "id": 5,
            "task": "Deploy staging server updates",
            "pic": "Jane",
            "status": "Done",
            "plan_effort": 2.0,
            "plan_start_date": yesterday.isoformat(),
            "plan_end_date": yesterday.isoformat(),
            "actual_effort": 1.5,
            "actual_start_date": yesterday.isoformat(),
            "actual_end_date": yesterday.isoformat(),
            "progress": 100.0,
            "issues": [],
            "remark": "Deployed successfully, all tests passing"
        },
        {
            "id": 6,
            "task": "Client call - Project kickoff",
            "pic": "Alex",
            "status": "To Do",
            "plan_effort": 1.0,
            "plan_start_date": today.isoformat(),
            "plan_end_date": today.isoformat(),
            "actual_effort": None,
            "actual_start_date": None,
            "actual_end_date": None,
            "progress": 0.0,
            "issues": [],
            "remark": "Agenda shared with client"
        },
        {
            "id": 7,
            "task": "Update user documentation",
            "pic": "Mike",
            "status": "In Progress",
            "plan_effort": 6.0,
            "plan_start_date": today.isoformat(),
            "plan_end_date": tomorrow.isoformat(),
            "actual_effort": 2.0,
            "actual_start_date": today.isoformat(),
            "actual_end_date": None,
            "progress": 30.0,
            "issues": ["Awaiting final screenshots from UI team"],
            "remark": "Including new payment workflow diagrams"
        }
    ]

    users = {
        1: {"id": 1, "name": "Chien", "isLead": False},
        2: {"id": 2, "name": "Bao", "isLead": True},
        3: {"id": 3, "name": "Cuong", "isLead": True},
        4: {"id": 4, "name": "Toi", "isLead": True},
        5: {"id": 5, "name": "Luong", "isLead": True},
    }

    return tasks, users

import requests

def get_api_data():
    try:
        response = requests.get("http://127.0.0.1:8000/tasks/search")
        response.raise_for_status()
        tasks = response.json()
        return tasks
    except Exception as e:
        print(f"Error fetching tasks from API: {e}")
        # Fallback to sample data if API fails
        tasks, _ = get_sample_data()
        return tasks


@app.route("/")
def index():
    return render_template('index.html')


@app.context_processor
def inject_user():
    """Make the current logged-in user available to all templates as `current_user`."""
    _, users = get_sample_data()
    user = None
    user_id = session.get('user_id')
    if user_id is not None:
        user = users.get(user_id)
    return dict(current_user=user)


@app.route('/login', methods=['GET', 'POST'])
def login():
    """Simple login by username (case-insensitive). Matches against demo users from get_sample_data()."""
    error = None
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        if not username:
            error = 'Please enter a username.'
            return render_template('login.html', error=error)

        # Use demo users for authentication in this simple example
        _, users = get_sample_data()
        matched = next((u for u in users.values() if u.get('name', '').lower() == username.lower()), None)
        if matched:
            session['user_id'] = matched['id']
            return redirect(url_for('index'))
        else:
            error = 'Invalid username'

    return render_template('login.html', error=error)


@app.route('/logout')
def logout():
    session.pop('user_id', None)
    return redirect(url_for('index'))


@app.route('/webhook/tasks', methods=['POST'])
def webhook_tasks_endpoint():
    if not request.is_json:
        return jsonify({"error": "Content-Type must be application/json"}), 400
    
    data = request.get_json()
    print(f"Received {len(data)} tasks via webhook")
    print(data)
    
    # Validate required fields in each task
    required_fields = ['id', 'task', 'pic', 'status']
    optional_fields = {
        'plan_effort': float,
        'plan_start_date': str,
        'plan_end_date': str,
        'actual_effort': float,
        'actual_start_date': str,
        'actual_end_date': str,
        'progress': float,
        'issues': list,
        'remark': str
    }
    
    # for task in data:
        # Check required fields
        # missing_fields = [field for field in required_fields if field not in task]
        # if missing_fields:
        #     return jsonify({
        #         "error": f"Task missing required fields: {', '.join(missing_fields)}",
        #         "task": task
        #     }), 400
            
        # # Validate optional fields if present
        # for field, field_type in optional_fields.items():
        #     if field in task and task[field] is not None:
        #         if not isinstance(task[field], field_type):
        #             return jsonify({
        #                 "error": f"Field '{field}' must be of type {field_type.__name__}",
        #                 "task": task
        #             }), 400
                    
        # # Validate that issues is a list of strings if present
        # if 'issues' in task and task['issues'] is not None:
        #     if not all(isinstance(issue, str) for issue in task['issues']):
        #         return jsonify({
        #             "error": "All issues must be strings",
        #             "task": task
        #         }), 400
    
    # Store the received tasks
    global webhook_tasks
    webhook_tasks = data
    
    # Notify all connected clients about the update
    notify_clients()
    
    return jsonify({
        "message": f"Successfully received {len(data)} tasks",
        "tasks": data
    })

# Store SSE clients
clients = []

def notify_clients():
    """Notify all clients that data has changed"""
    msg = json.dumps({"type": "tasks_updated", "timestamp": time.time()})
    for client in clients[:]:  # Use a slice copy to avoid modification during iteration
        try:
            client.put(msg)
        except:
            if client in clients:
                clients.remove(client)

@app.route('/events')
def events():
    """SSE endpoint for real-time updates"""
    def event_stream():
        # Create a client queue
        client = Queue()
        clients.append(client)
        
        # Send initial connection confirmation once
        yield "event: connected\ndata: {}\n\n"
        
        try:
            while True:
                try:
                    # Wait for messages with a timeout
                    msg = client.get(timeout=30)
                    if msg:
                        yield f"event: message\ndata: {msg}\n\n"
                except:
                    # If no message in 30 seconds, send a keepalive ping
                    yield "event: ping\ndata: {}\n\n"
                
        except GeneratorExit:
            if client in clients:
                clients.remove(client)
    
    return Response(
        event_stream(),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no'  # Disable proxy buffering
        }
    )

@app.route('/api/data')
def api_data():
    # Use webhook tasks if available, otherwise use sample data
    tasks = webhook_tasks if webhook_tasks else get_api_data()
    _, users = get_sample_data()  # Always use sample users for demo
    return jsonify({"tasks": tasks, "users": users})


if __name__ == '__main__':
    app.run(debug=True)
