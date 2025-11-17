# Q-CHAT-10 Backend API

FastAPI backend for Q-CHAT-10 (Quantitative Checklist for Autism in Toddlers) screening tool.

## Features

- **10 Q-CHAT Questions** with 5-option scale
- **JSON File Storage** - No database required
- **Bilingual Support** - English and Arabic
- **Scoring Logic** - Automatic calculation with reversed Q10
- **RESTful API** - Clean, well-documented endpoints
- **No Authentication** - Simple, open access

## Setup

### 1. Install Dependencies

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` if needed:
```env
DATA_STORAGE_PATH=./data/sessions
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
PORT=8000
```

### 3. Run Server

```bash
# Development
uvicorn app.main:app --reload --port 8000

# Production
python -m app.main
```

Server will be available at: http://localhost:8000

## API Documentation

Interactive API docs available at:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## API Endpoints

### Health Check
```
GET /health
```

### Create Session
```
POST /api/sessions/create
Body: {
  "child_name": "Sarah",
  "child_age_months": 22,
  "parent_name": "Ahmed",
  "language": "en"
}
Response: {
  "session_token": "abc123...",
  "child_name": "Sarah",
  "child_age_months": 22,
  "created_at": "2024-01-15T10:30:00"
}
```

### Get Session
```
GET /api/sessions/{session_token}
```

### Get Question
```
GET /api/sessions/{session_token}/question/{question_number}
```

### Submit Answer
```
POST /api/sessions/{session_token}/answer
Body: {
  "question_number": 1,
  "selected_option": "C"
}
```

### Get Report
```
GET /api/sessions/{session_token}/report
```

### Get All Questions
```
GET /api/questions
```

## Q-CHAT Scoring

- **Total Questions**: 10
- **Scoring**: 0-10 points
- **Threshold**: Score > 3 = Referral recommended
- **Questions 1-9**: Score 1 point if C, D, or E selected
- **Question 10**: Score 1 point if A, B, or C selected (REVERSED)

## Data Storage

Sessions are stored as JSON files in `data/sessions/` directory:
- One file per session
- Filename: `{session_token}.json`
- Human-readable JSON format
- No database required

## Project Structure

```
backend/
├── app/
│   ├── main.py           # FastAPI application
│   ├── config.py         # Configuration
│   ├── models.py         # Pydantic models
│   ├── questions.py      # Q-CHAT questions data
│   ├── scoring.py        # Scoring logic
│   └── utils.py          # Helper functions
├── data/
│   └── sessions/         # JSON session files
├── requirements.txt
├── .env.example
└── README.md
```

## Development

### Testing Endpoints with curl

Create session:
```bash
curl -X POST http://localhost:8000/api/sessions/create \
  -H "Content-Type: application/json" \
  -d '{
    "child_name": "Test Child",
    "child_age_months": 22,
    "parent_name": "Test Parent",
    "language": "en"
  }'
```

Submit answer:
```bash
curl -X POST http://localhost:8000/api/sessions/{token}/answer \
  -H "Content-Type: application/json" \
  -d '{
    "question_number": 1,
    "selected_option": "C"
  }'
```

## License

MIT
