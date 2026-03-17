from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import psycopg2
import os
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
import time

# ── App instance ────────────────────────────────────────────────────────────
app = FastAPI(title="DevOps Project API")

# ── CORS — allows React frontend to call this API ───────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Prometheus metrics ───────────────────────────────────────────────────────
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

# ── Database connection ──────────────────────────────────────────────────────
def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "postgres-service"),
        port=os.getenv("DB_PORT", "5432"),
        database=os.getenv("DB_NAME", "appdb"),
        user=os.getenv("DB_USER", "appuser"),
        password=os.getenv("DB_PASSWORD", "apppassword")
    )

# ── Pydantic model — defines shape of request body ──────────────────────────
class User(BaseModel):
    name: str
    email: str

# ── Routes ───────────────────────────────────────────────────────────────────

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
        users = [{"id": r[0], "name": r[1], "email": r[2]} for r in rows]
        return {"users": users}
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


@app.get("/metrics")
def metrics():
    # Prometheus scrapes this endpoint every 15 seconds
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
