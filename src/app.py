"""
High School Management System API

A super simple FastAPI application that allows students to view and sign up
for extracurricular activities at Mergington High School.
"""

from fastapi import FastAPI, HTTPException, Depends, Form, status, Cookie
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, JSONResponse
import os
import json
import hashlib
from pathlib import Path
from typing import Optional

app = FastAPI(title="Mergington High School API",
              description="API for viewing and signing up for extracurricular activities")

# Mount the static files directory
current_dir = Path(__file__).parent
app.mount("/static", StaticFiles(directory=os.path.join(Path(__file__).parent,
          "static")), name="static")

# Simple session store (in production, use proper session management)
active_sessions = {}

def load_teacher_credentials():
    """Load teacher credentials from JSON file"""
    try:
        with open(os.path.join(current_dir, 'teachers.json'), 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return {}

def create_session_token(username: str) -> str:
    """Create a simple session token"""
    import secrets
    token = secrets.token_urlsafe(32)
    active_sessions[token] = username
    return token

def get_current_user(session_token: Optional[str] = Cookie(None)):
    """Get current authenticated user from session"""
    if session_token and session_token in active_sessions:
        return active_sessions[session_token]
    return None

def require_admin(current_user: Optional[str] = Depends(get_current_user)):
    """Dependency to require admin authentication"""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    return current_user

# In-memory activity database
activities = [
    {
        "name": "Chess Club",
        "description": "Learn strategies and compete in chess tournaments",
        "schedule": "Fridays, 3:30 PM - 5:00 PM",
        "max_participants": 12,
        "students": ["michael@mergington.edu", "daniel@mergington.edu"]
    },
    {
        "name": "Programming Class", 
        "description": "Learn programming fundamentals and build software projects",
        "schedule": "Tuesdays and Thursdays, 3:30 PM - 4:30 PM",
        "max_participants": 20,
        "students": ["emma@mergington.edu", "sophia@mergington.edu"]
    },
    {
        "name": "Gym Class",
        "description": "Physical education and sports activities", 
        "schedule": "Mondays, Wednesdays, Fridays, 2:00 PM - 3:00 PM",
        "max_participants": 30,
        "students": ["john@mergington.edu", "olivia@mergington.edu"]
    },
    {
        "name": "Soccer Team",
        "description": "Join the school soccer team and compete in matches",
        "schedule": "Tuesdays and Thursdays, 4:00 PM - 5:30 PM", 
        "max_participants": 22,
        "students": ["liam@mergington.edu", "noah@mergington.edu"]
    },
    {
        "name": "Basketball Team",
        "description": "Practice and play basketball with the school team",
        "schedule": "Wednesdays and Fridays, 3:30 PM - 5:00 PM",
        "max_participants": 15,
        "students": ["ava@mergington.edu", "mia@mergington.edu"]
    },
    {
        "name": "Art Club",
        "description": "Explore your creativity through painting and drawing",
        "schedule": "Thursdays, 3:30 PM - 5:00 PM",
        "max_participants": 15,
        "students": ["amelia@mergington.edu", "harper@mergington.edu"]
    },
    {
        "name": "Drama Club",
        "description": "Act, direct, and produce plays and performances",
        "schedule": "Mondays and Wednesdays, 4:00 PM - 5:30 PM",
        "max_participants": 20,
        "students": ["ella@mergington.edu", "scarlett@mergington.edu"]
    },
    {
        "name": "Math Club",
        "description": "Solve challenging problems and participate in math competitions",
        "schedule": "Tuesdays, 3:30 PM - 4:30 PM",
        "max_participants": 10,
        "students": ["james@mergington.edu", "benjamin@mergington.edu"]
    },
    {
        "name": "Debate Team",
        "description": "Develop public speaking and argumentation skills",
        "schedule": "Fridays, 4:00 PM - 5:30 PM",
        "max_participants": 12,
        "students": ["charlotte@mergington.edu", "henry@mergington.edu"]
    }
]


@app.get("/")
def root():
    return RedirectResponse(url="/static/index.html")

@app.post("/admin/login")
def admin_login(username: str = Form(...), password: str = Form(...)):
    """Admin login endpoint"""
    teachers = load_teacher_credentials()
    
    if username in teachers and teachers[username] == password:
        session_token = create_session_token(username)
        response = JSONResponse(content={"message": "Login successful", "user": username})
        response.set_cookie(
            key="session_token", 
            value=session_token, 
            httponly=True,
            max_age=3600  # 1 hour
        )
        return response
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

@app.post("/admin/logout")
def admin_logout(session_token: Optional[str] = Cookie(None)):
    """Admin logout endpoint"""
    if session_token and session_token in active_sessions:
        del active_sessions[session_token]
    
    response = JSONResponse(content={"message": "Logout successful"})
    response.delete_cookie(key="session_token")
    return response

@app.get("/admin/status")
def admin_status(current_user: Optional[str] = Depends(get_current_user)):
    """Check if user is logged in as admin"""
    return {"authenticated": current_user is not None, "user": current_user}

@app.get("/activities")
def get_activities():
    return activities


@app.post("/activities/{activity_id}/signup")
def signup_for_activity(activity_id: int, name: str = Form(...), current_user: str = Depends(require_admin)):
    if activity_id < 0 or activity_id >= len(activities):
        raise HTTPException(status_code=404, detail="Activity not found")
    
    activity = activities[activity_id]
    if name not in activity['students']:
        activity['students'].append(name)
    
    return {"message": f"{name} signed up for {activity['name']}", "activity": activity}

@app.delete("/activities/{activity_id}/unregister")
def unregister_from_activity(activity_id: int, name: str = Form(...), current_user: str = Depends(require_admin)):
    if activity_id < 0 or activity_id >= len(activities):
        raise HTTPException(status_code=404, detail="Activity not found")
    
    activity = activities[activity_id]
    if name in activity['students']:
        activity['students'].remove(name)
    
    return {"message": f"{name} unregistered from {activity['name']}", "activity": activity}


@app.delete("/activities/{activity_name}/unregister")
def unregister_from_activity(activity_name: str, email: str):
    """Unregister a student from an activity"""
    # Validate activity exists
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Get the specific activity
    activity = activities[activity_name]

    # Validate student is signed up
    if email not in activity["participants"]:
        raise HTTPException(
            status_code=400,
            detail="Student is not signed up for this activity"
        )

    # Remove student
    activity["participants"].remove(email)
    return {"message": f"Unregistered {email} from {activity_name}"}
