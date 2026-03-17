# Scheduler Backend API

Flask-based backend for the Scheduler application with Firebase Admin SDK integration.

## Setup

1. **Create virtual environment:**
   ```bash
   python -m venv venv
   venv\Scripts\activate  # Windows
   source venv/bin/activate  # macOS/Linux
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure Firebase:**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Select your project
   - Go to Project Settings → Service accounts
   - Click "Generate new private key"
   - Save the JSON file as `serviceAccountKey.json` in this directory

4. **Set up environment variables:**
   ```bash
   copy .env.example .env
   # Edit .env with your configuration
   ```

5. **Run the server:**
   ```bash
   python app.py
   ```

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | No | API info |
| GET | `/api/health` | No | Health check |
| GET | `/api/auth/verify` | Yes | Verify token |
| GET | `/api/user/profile` | Yes | Get user profile |
| PUT | `/api/user/profile` | Yes | Update user profile |

## Authentication

Protected routes require a Firebase ID token in the Authorization header:

```
Authorization: Bearer <firebase-id-token>
```

Get the token from Firebase Auth in the frontend:
```javascript
const token = await auth.currentUser.getIdToken();
```
