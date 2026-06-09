# MIRA — Medical Intelligence Robotic Automation
### Health Prediction Application — Task 1 (Junior AI/ML Developer Assessment)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11+, Flask |
| Database | SQLite (via Python's built-in `sqlite3`) |
| AI/ML API | Anthropic Claude API (`claude-sonnet-4-20250514`) |
| Frontend | Vanilla HTML5, CSS3, JavaScript (ES6+) |
| Fonts | Google Fonts — Inter & Space Grotesk |

### Why this stack?
- **Flask** is lightweight and ideal for REST APIs — no boilerplate overhead.
- **SQLite** requires zero configuration for a single-user assessment app while demonstrating persistent storage.
- **Anthropic Claude API** acts as the AI/ML health prediction engine, analysing blood test values (glucose, haemoglobin, cholesterol) and returning a clinical-style assessment.
- **Vanilla JS** keeps the frontend dependency-free and demonstrates core DOM skills without framework abstraction.

---

## Project Structure

```
mira-health/
├── app.py                  # Flask application — routes, DB, AI integration
├── requirements.txt
├── mira.db                 # Auto-created SQLite database
├── templates/
│   └── index.html          # Single-page application template
└── static/
    ├── css/style.css       # All styling
    └── js/app.js           # All frontend CRUD logic
```

---

## Setup & Run

### 1. Clone / download the project

```bash
git clone <your-repo-url>
cd mira-health
```

### 2. Create a virtual environment (recommended)

```bash
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS / Linux:
source venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Set your Anthropic API key

**Windows (PowerShell):**
```powershell
$env:ANTHROPIC_API_KEY = "sk-ant-YOUR_KEY_HERE"
```

**macOS / Linux:**
```bash
export ANTHROPIC_API_KEY="sk-ant-YOUR_KEY_HERE"
```

> ⚠️ Never commit your API key. The key is read from the environment — it is **not** hard-coded anywhere in the source.

### 5. Run the application

```bash
python app.py
```

Open your browser at **http://localhost:5000**

---

## Features

| Feature | Details |
|---|---|
| **Create** | Add a patient with name, DOB, email, and blood test values |
| **Read** | View all patients in a sortable table; click 👁 for full detail |
| **Update** | Edit any record; AI assessment is re-generated automatically |
| **Delete** | Soft-confirm deletion modal prevents accidental removal |
| **AI Assessment** | Claude API analyses glucose, haemoglobin & cholesterol and returns a 2–3 sentence clinical remark |
| **Validation** | Email format, DOB not in future, blood values must be positive numeric |
| **Search** | Real-time filter by name or email |
| **Persistent storage** | All records stored in `mira.db` (SQLite) |

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/patients` | List all patients |
| POST | `/api/patients` | Create patient + AI assessment |
| GET | `/api/patients/<id>` | Get single patient |
| PUT | `/api/patients/<id>` | Update patient + re-run AI |
| DELETE | `/api/patients/<id>` | Delete patient |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key |

---

## Challenges & Decisions

1. **AI latency** — Claude API calls take 2–5 seconds. A loading spinner was added to the Save button so the UI remains responsive and the user knows the system is working.
2. **Unique email constraint** — SQLite's `UNIQUE` constraint on `email` prevents duplicate patient records; the API returns a clear 409 conflict message.
3. **Age calculation for AI context** — DOB is used to calculate approximate age before sending to the AI, giving the model better context for normal blood value ranges.
4. **No framework dependency** — chose vanilla JS over React/Vue to keep the project lightweight and avoid `node_modules` complexity for a WFH setup.

---

*Submitted for Gokul Infocare Pty Ltd — Junior AI/ML Developer Task 1*
