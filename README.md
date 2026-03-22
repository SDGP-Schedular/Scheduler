# Scheduler App

Scheduler is a full-stack study planner and productivity app with:
- React + Vite frontend
- Flask backend API
- Firebase Authentication + Firestore
- AI-powered quiz generation (Gemini)

## Repository Structure

```text
Scheduler/
├── Frontend/   # React app (Vite)
└── Backend/    # Flask API + Firebase Admin
```

## Prerequisites

- Node.js 18+
- Python 3.10+
- npm
- Firebase project (Auth + Firestore)

## Backend Setup (Flask)

1. Open a terminal in `Backend/`.
2. Create and activate a virtual environment:

	```bash
	python -m venv venv
	venv\Scripts\activate
	```

3. Install dependencies:

	```bash
	pip install -r requirements.txt
	```

4. Add Firebase Admin credentials:
	- Place your service account JSON file at `Backend/serviceAccountKey.json`
	- Or set `FIREBASE_SERVICE_ACCOUNT_JSON` as an environment variable

5. Configure environment variables (create `Backend/.env`):

	```env
	SECRET_KEY=replace-with-a-secure-random-value
	FLASK_ENV=development
	FLASK_DEBUG=True

	FIREBASE_SERVICE_ACCOUNT_PATH=serviceAccountKey.json
	FIREBASE_PROJECT_ID=your-firebase-project-id

	GEMINI_API_KEY=your-gemini-api-key
	CORS_ORIGINS=http://localhost:5173,http://localhost:3000
	```

6. Run backend:

	```bash
	python app.py
	```

Backend runs at `http://localhost:5000` by default.

## Frontend Setup (React + Vite)

1. Open a terminal in `Frontend/`.
2. Install dependencies:

	```bash
	npm install
	```

3. Start frontend:

	```bash
	npm run dev:frontend
	```

Frontend runs at `http://localhost:5173` by default.

## Run Both Frontend + Backend (from Frontend folder)

```bash
npm run dev
```

This uses `concurrently` to run Vite and Flask together.

## API Quick Check

- Health: `GET /api/health`
- Auth verify: `GET /api/auth/verify` (Bearer token required)
- Quiz generation: `POST /api/quiz/generate` (Bearer token required)

## Notes

- Make sure Firebase project ID is configured (`FIREBASE_PROJECT_ID` or `GOOGLE_CLOUD_PROJECT`) to avoid token verification issues.
- Keep `serviceAccountKey.json` private and never commit real secrets.

## License

This project is licensed under the terms in [LICENSE](LICENSE).
