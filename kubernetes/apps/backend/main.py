from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import psycopg2
import os
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
import time

app = FastAPI(title="DevOps Project API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

REQUEST_COUNT = Counter(
    "app_request_count_total",
    "Total number of requests",
    ["method", "endpoint"]
)

REQUEST_LATENCY = Histogram(
    "app_request_latency_seconds",
    "Request latency in seconds",
    ["endpoint"]
)

def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "postgres-service"),
        port=os.getenv("DB_PORT", "5432"),
        database=os.getenv("DB_NAME", "appdb"),
        user=os.getenv("DB_USER", "appuser"),
        password=os.getenv("DB_PASSWORD", "apppassword")
    )

class User(BaseModel):
    name: str
    email: str

@app.get("/")
def health_check():
    REQUEST_COUNT.labels(method="GET", endpoint="/").inc()
    return {"status": "healthy", "service": "backend"}

@app.get("/api/users")
def get_users():
    start = time.time()
    REQUEST_COUNT.labels(method="GET", endpoint="/api/users").inc()
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT id, name, email FROM users ORDER BY id DESC;")
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return {"users": [{"id": r[0], "name": r[1], "email": r[2]} for r in rows]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        REQUEST_LATENCY.labels(endpoint="/api/users").observe(time.time() - start)

@app.post("/api/users")
def create_user(user: User):
    start = time.time()
    REQUEST_COUNT.labels(method="POST", endpoint="/api/users").inc()
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO users (name, email) VALUES (%s, %s) RETURNING id;",
            (user.name, user.email)
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        return {"message": "User created", "id": new_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        REQUEST_LATENCY.labels(endpoint="/api/users").observe(time.time() - start)

@app.delete("/api/users/{user_id}")
def delete_user(user_id: int):
    start = time.time()
    REQUEST_COUNT.labels(method="DELETE", endpoint="/api/users").inc()
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM users WHERE id = %s RETURNING id;", (user_id,))
        deleted = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        if not deleted:
            raise HTTPException(status_code=404, detail="User not found")
        return {"message": "User deleted", "id": user_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        REQUEST_LATENCY.labels(endpoint="/api/users").observe(time.time() - start)

@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
