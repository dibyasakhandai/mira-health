"""
MIRA - Medical Intelligence Robotic Automation
Health Prediction Application - Task 1
Junior AI/ML Developer Assessment
"""

import os
import sqlite3
import requests
from datetime import datetime, date
from flask import Flask, request, jsonify, render_template, g

app = Flask(__name__)
DATABASE = "mira.db"

# ─── DB helpers ───────────────────────────────────────────────────────────────

def get_db():
    db = getattr(g, "_database", None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
    return db

@app.teardown_appcontext
def close_db(exc):
    db = getattr(g, "_database", None)
    if db is not None:
        db.close()

def init_db():
    with app.app_context():
        db = get_db()
        db.execute("""
            CREATE TABLE IF NOT EXISTS patients (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name   TEXT    NOT NULL,
                dob         TEXT    NOT NULL,
                email       TEXT    NOT NULL UNIQUE,
                glucose     REAL    NOT NULL,
                haemoglobin REAL    NOT NULL,
                cholesterol REAL    NOT NULL,
                remarks     TEXT    DEFAULT '',
                created_at  TEXT    DEFAULT (datetime('now')),
                updated_at  TEXT    DEFAULT (datetime('now'))
            )
        """)
        db.commit()

# ─── AI / Health prediction ───────────────────────────────────────────────────

def get_health_prediction(name, dob, glucose, haemoglobin, cholesterol):
    try:
        birth = datetime.strptime(dob, "%Y-%m-%d").date()
        age = (date.today() - birth).days // 365
    except Exception:
        age = "unknown"

    prompt = (
        f"You are a clinical decision-support AI. Analyse the following patient "
        f"blood test results and provide a brief (2-3 sentence) health assessment "
        f"noting any elevated risk factors, likely conditions, or healthy status "
        f"if all values are within normal ranges. Be concise and professional.\n\n"
        f"Patient: {name}, Age: {age}\n"
        f"Fasting Glucose: {glucose} mg/dL (normal: 70-99)\n"
        f"Haemoglobin: {haemoglobin} g/dL (normal: M 13.5-17.5 / F 12.0-15.5)\n"
        f"Total Cholesterol: {cholesterol} mg/dL (desirable: <200)\n\n"
        f"Respond with only the assessment text, no preamble."
    )

    api_key = os.environ.get("GROQ_API_KEY", "")
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }
    payload = {
        "model": "llama-3.1-8b-instant",
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 200,
    }

    try:
        resp = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"].strip()
    except Exception as exc:
        return f"AI service unavailable: {exc}"
# ─── Routes ───────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/patients", methods=["GET"])
def list_patients():
    db = get_db()
    rows = db.execute(
        "SELECT * FROM patients ORDER BY created_at DESC"
    ).fetchall()
    return jsonify([dict(r) for r in rows])


@app.route("/api/patients", methods=["POST"])
def create_patient():
    data = request.get_json()
    err = _validate(data)
    if err:
        return jsonify({"error": err}), 400

    remarks = get_health_prediction(
        data["full_name"], data["dob"],
        float(data["glucose"]), float(data["haemoglobin"]),
        float(data["cholesterol"]),
    )

    db = get_db()
    try:
        cur = db.execute(
            """INSERT INTO patients
               (full_name, dob, email, glucose, haemoglobin, cholesterol, remarks)
               VALUES (?,?,?,?,?,?,?)""",
            (data["full_name"], data["dob"], data["email"],
             float(data["glucose"]), float(data["haemoglobin"]),
             float(data["cholesterol"]), remarks),
        )
        db.commit()
    except sqlite3.IntegrityError:
        return jsonify({"error": "A patient with this email already exists."}), 409

    row = db.execute(
        "SELECT * FROM patients WHERE id=?", (cur.lastrowid,)
    ).fetchone()
    return jsonify(dict(row)), 201


@app.route("/api/patients/<int:pid>", methods=["GET"])
def get_patient(pid):
    row = get_db().execute(
        "SELECT * FROM patients WHERE id=?", (pid,)
    ).fetchone()
    if not row:
        return jsonify({"error": "Not found"}), 404
    return jsonify(dict(row))


@app.route("/api/patients/<int:pid>", methods=["PUT"])
def update_patient(pid):
    data = request.get_json()
    err = _validate(data, update=True, pid=pid)
    if err:
        return jsonify({"error": err}), 400

    remarks = get_health_prediction(
        data["full_name"], data["dob"],
        float(data["glucose"]), float(data["haemoglobin"]),
        float(data["cholesterol"]),
    )

    db = get_db()
    try:
        db.execute(
            """UPDATE patients SET
               full_name=?, dob=?, email=?, glucose=?,
               haemoglobin=?, cholesterol=?, remarks=?,
               updated_at=datetime('now')
               WHERE id=?""",
            (data["full_name"], data["dob"], data["email"],
             float(data["glucose"]), float(data["haemoglobin"]),
             float(data["cholesterol"]), remarks, pid),
        )
        db.commit()
    except sqlite3.IntegrityError:
        return jsonify({"error": "Email already used by another patient."}), 409

    row = db.execute(
        "SELECT * FROM patients WHERE id=?", (pid,)
    ).fetchone()
    if not row:
        return jsonify({"error": "Not found"}), 404
    return jsonify(dict(row))


@app.route("/api/patients/<int:pid>", methods=["DELETE"])
def delete_patient(pid):
    db = get_db()
    cur = db.execute("DELETE FROM patients WHERE id=?", (pid,))
    db.commit()
    if cur.rowcount == 0:
        return jsonify({"error": "Not found"}), 404
    return jsonify({"message": "Patient deleted successfully."}), 200


# ─── Validation ───────────────────────────────────────────────────────────────

def _validate(data, update=False, pid=None):
    required = ["full_name", "dob", "email", "glucose", "haemoglobin", "cholesterol"]
    for field in required:
        if not data.get(field, ""):
            return f"'{field}' is required."

    import re
    email = str(data["email"]).strip()
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        return "Invalid email address format."

    try:
        dob = datetime.strptime(str(data["dob"]), "%Y-%m-%d").date()
        if dob >= date.today():
            return "Date of birth cannot be today or a future date."
    except ValueError:
        return "Invalid date of birth format (YYYY-MM-DD expected)."

    for field in ["glucose", "haemoglobin", "cholesterol"]:
        try:
            val = float(data[field])
            if val <= 0:
                return f"'{field}' must be a positive number."
        except (TypeError, ValueError):
            return f"'{field}' must be a numeric value."

    return None


# ─── Entry point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    init_db()
    app.run(debug=True, port=5000)