"""
Scheduler Backend API
Flask server with Firebase Admin SDK integration
"""

import os
import time
import logging
import json
from datetime import datetime, timezone, timedelta
from functools import wraps
from collections import defaultdict
from flask import Flask, jsonify, request, g
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, firestore

from config import config
from middleware.auth import verify_firebase_token


# ==================== Logging Setup ====================

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)


# ==================== Rate Limiting ====================

# In-memory rate limiter (per-user, resets every minute)
_rate_limits = defaultdict(list)  # uid -> [timestamp, ...]
RATE_LIMIT_MAX = 10  # max requests per window
RATE_LIMIT_WINDOW = 60  # seconds

# ==================== AI Quiz Daily Limits ====================

AI_QUIZ_DAILY_LIMIT = 3  # max AI quizzes per user per day
IST = timezone(timedelta(hours=5, minutes=30))  # Sri Lanka timezone (IST/UTC+5:30)


def rate_limit(f):
    """Decorator to rate-limit endpoints per authenticated user."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        uid = getattr(request, 'user', {}).get('uid', 'anonymous')
        now = time.time()

        # Clean old entries outside the window
        _rate_limits[uid] = [
            ts for ts in _rate_limits[uid]
            if now - ts < RATE_LIMIT_WINDOW
        ]

        if len(_rate_limits[uid]) >= RATE_LIMIT_MAX:
            logger.warning(f"Rate limit exceeded for user {uid}")
            return jsonify({
                'error': 'Too many requests. Please wait a moment and try again.',
                'code': 'RATE_LIMITED'
            }), 429

        _rate_limits[uid].append(now)
        return f(*args, **kwargs)

    return decorated_function


# ==================== AI Quiz Limit Helpers ====================

def _get_today_ist():
    """Get today's date string in IST (YYYY-MM-DD)."""
    return datetime.now(IST).strftime('%Y-%m-%d')


def _get_midnight_ist_iso():
    """Get the next midnight IST as an ISO string for countdown."""
    now = datetime.now(IST)
    midnight = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    return midnight.isoformat()


def _get_ai_quiz_usage(uid):
    """
    Get today's AI quiz usage for a user from Firestore.
    Returns (count, date_str).
    """
    try:
        db = firestore.client()
        usage_ref = db.collection('users').document(uid).collection('quizUsage').document('daily')
        usage_doc = usage_ref.get()

        if usage_doc.exists:
            data = usage_doc.to_dict()
            stored_date = data.get('date', '')
            today = _get_today_ist()

            if stored_date == today:
                return data.get('count', 0), today
            # Different day — usage resets
            return 0, today
        return 0, _get_today_ist()
    except Exception as e:
        logger.error(f"Error reading AI quiz usage for {uid}: {e}")
        return 0, _get_today_ist()


def _increment_ai_quiz_usage(uid):
    """Increment today's AI quiz count for a user in Firestore."""
    try:
        db = firestore.client()
        usage_ref = db.collection('users').document(uid).collection('quizUsage').document('daily')
        today = _get_today_ist()

        current_count, _ = _get_ai_quiz_usage(uid)
        usage_ref.set({
            'count': current_count + 1,
            'date': today,
            'lastUsed': firestore.SERVER_TIMESTAMP
        })
        logger.info(f"AI quiz usage for {uid}: {current_count + 1}/{AI_QUIZ_DAILY_LIMIT}")
    except Exception as e:
        logger.error(f"Error updating AI quiz usage for {uid}: {e}")


# ==================== Input Validation ====================

MAX_STRING_LENGTH = 200


def validate_string(value, field_name, max_length=MAX_STRING_LENGTH):
    """Validate and sanitize a string input."""
    if not isinstance(value, str):
        return str(value)[:max_length]
    return value.strip()[:max_length]


# ==================== App Factory ====================

def create_app(config_name=None):
    """Application factory for creating Flask app."""

    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')

    app = Flask(__name__)
    app.config.from_object(config[config_name])

    # Initialize CORS — explicitly allow auth headers for preflight
    CORS(app,
         origins=app.config['CORS_ORIGINS'],
         supports_credentials=True,
         allow_headers=["Content-Type", "Authorization"],
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    )

    # Initialize Firebase Admin SDK
    initialize_firebase(app)

    # Register request logging middleware
    register_request_logging(app)

    # Register routes
    register_routes(app)

    # Initialize background scheduler for reminders and notifications
    try:
        from services.reminder_scheduler import initialize_scheduler
        initialize_scheduler()
    except Exception as e:
        logger.warning(f"Failed to initialize scheduler: {e}")

    return app


def initialize_firebase(app):
    """Initialize Firebase Admin SDK."""

    def _load_service_account_from_env():
        raw_service_account = os.getenv('FIREBASE_SERVICE_ACCOUNT_JSON', '')
        if not raw_service_account:
            return None

        try:
            service_account_data = json.loads(raw_service_account)
            return service_account_data
        except Exception as parse_err:
            logger.error(f"Invalid FIREBASE_SERVICE_ACCOUNT_JSON value: {parse_err}")
            return None

    def _resolve_project_id(service_account_path):
        project_id = app.config.get('FIREBASE_PROJECT_ID') or os.getenv('GOOGLE_CLOUD_PROJECT', '')
        if project_id:
            return project_id

        env_service_account = _load_service_account_from_env()
        if env_service_account and env_service_account.get('project_id'):
            return env_service_account.get('project_id', '')

        if service_account_path and os.path.exists(service_account_path):
            try:
                with open(service_account_path, 'r', encoding='utf-8') as service_account_file:
                    service_account_data = json.load(service_account_file)
                    return service_account_data.get('project_id', '')
            except Exception as read_err:
                logger.warning(f"Could not read project_id from service account file: {read_err}")

        return ''

    try:
        # Check if Firebase is already initialized
        firebase_admin.get_app()
    except ValueError:
        # Initialize Firebase
        service_account_path = app.config['FIREBASE_SERVICE_ACCOUNT_PATH']
        env_service_account = _load_service_account_from_env()
        project_id = _resolve_project_id(service_account_path)
        options = {'projectId': project_id} if project_id else None

        if project_id:
            logger.info(f"Using Firebase project ID: {project_id}")
        else:
            logger.warning(
                "Firebase project ID is not configured. "
                "Set FIREBASE_PROJECT_ID or GOOGLE_CLOUD_PROJECT to avoid token verification failures."
            )

        if os.path.exists(service_account_path):
            cred = credentials.Certificate(service_account_path)
            if options:
                firebase_admin.initialize_app(cred, options)
            else:
                firebase_admin.initialize_app(cred)
            logger.info(f"Firebase initialized with service account: {service_account_path}")
        elif env_service_account:
            cred = credentials.Certificate(env_service_account)
            if options:
                firebase_admin.initialize_app(cred, options)
            else:
                firebase_admin.initialize_app(cred)
            logger.info("Firebase initialized with FIREBASE_SERVICE_ACCOUNT_JSON credentials")
        else:
            logger.warning(f"Service account file not found at: {service_account_path}")
            logger.info("Firebase Admin SDK will use default credentials if available.")
            try:
                if options:
                    firebase_admin.initialize_app(options=options)
                else:
                    firebase_admin.initialize_app()
                logger.info("Firebase initialized with default credentials")
            except Exception as e:
                logger.error(f"Failed to initialize Firebase: {e}")
                logger.info("Please provide a valid service account file to enable authentication.")


def register_request_logging(app):
    """Register before/after request hooks for logging."""

    @app.before_request
    def before_request():
        g.start_time = time.time()

    @app.after_request
    def after_request(response):
        duration = time.time() - getattr(g, 'start_time', time.time())
        duration_ms = round(duration * 1000)

        # Skip logging for health checks to reduce noise
        if request.path == '/api/health':
            return response

        logger.info(
            f"{request.method} {request.path} → {response.status_code} ({duration_ms}ms)"
        )
        return response


def register_routes(app):
    """Register API routes."""

    # ==================== Public Routes ====================

    @app.route('/')
    def index():
        """Root endpoint - API info."""
        return jsonify({
            'name': 'Scheduler API',
            'version': '1.0.0',
            'status': 'running',
            'endpoints': {
                'health': '/api/health',
                'user_profile': '/api/user/profile (protected)',
                'verify_token': '/api/auth/verify (protected)',
                'quiz_generate': '/api/quiz/generate (protected, POST)',
                'quiz_limit': '/api/quiz/limit (protected, GET)',
                'quiz_bank': '/api/quiz/generate-bank (protected, POST)'
            }
        })

    @app.route('/api/health')
    def health_check():
        """Health check endpoint."""
        return jsonify({
            'status': 'healthy',
            'message': 'Scheduler API is running'
        })

    # ==================== Protected Routes ====================

    @app.route('/api/auth/verify')
    @verify_firebase_token
    def verify_auth():
        """
        Verify authentication token.
        Returns user info if token is valid.
        """
        return jsonify({
            'authenticated': True,
            'user': request.user
        })

    @app.route('/api/user/profile')
    @verify_firebase_token
    def get_user_profile():
        """
        Get user profile from Firestore.
        Creates a new profile if it doesn't exist.
        """
        try:
            db = firestore.client()
            user_ref = db.collection('users').document(request.user['uid'])
            user_doc = user_ref.get()

            if user_doc.exists:
                profile = user_doc.to_dict()
                return jsonify({
                    'success': True,
                    'profile': profile
                })
            else:
                # Create new user profile
                new_profile = {
                    'uid': request.user['uid'],
                    'email': request.user['email'],
                    'name': request.user.get('name', ''),
                    'picture': request.user.get('picture', ''),
                    'created_at': firestore.SERVER_TIMESTAMP,
                    'updated_at': firestore.SERVER_TIMESTAMP,
                    'settings': {
                        'notifications': True,
                        'theme': 'light'
                    }
                }
                user_ref.set(new_profile)

                return jsonify({
                    'success': True,
                    'profile': new_profile,
                    'is_new_user': True
                })

        except Exception as e:
            logger.error(f"Error getting user profile: {e}")
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500

    @app.route('/api/user/profile', methods=['PUT'])
    @verify_firebase_token
    def update_user_profile():
        """Update user profile."""
        try:
            data = request.get_json()

            if not data:
                return jsonify({
                    'success': False,
                    'error': 'No data provided'
                }), 400

            # Only allow updating certain fields
            allowed_fields = ['name', 'settings']
            update_data = {k: v for k, v in data.items() if k in allowed_fields}
            update_data['updated_at'] = firestore.SERVER_TIMESTAMP

            db = firestore.client()
            user_ref = db.collection('users').document(request.user['uid'])
            user_ref.update(update_data)

            return jsonify({
                'success': True,
                'message': 'Profile updated successfully'
            })

        except Exception as e:
            logger.error(f"Error updating user profile: {e}")
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500

    # ==================== Quiz Limit Endpoints ====================

    @app.route('/api/quiz/limit')
    @verify_firebase_token
    def get_quiz_limit():
        """
        Get the user's daily AI quiz usage and limit.
        Returns used count, limit, remaining, and reset time.
        """
        try:
            uid = request.user['uid']
            used, _ = _get_ai_quiz_usage(uid)
            remaining = max(0, AI_QUIZ_DAILY_LIMIT - used)
            resets_at = _get_midnight_ist_iso()

            return jsonify({
                'success': True,
                'used': used,
                'limit': AI_QUIZ_DAILY_LIMIT,
                'remaining': remaining,
                'resetsAt': resets_at
            })

        except Exception as e:
            logger.error(f"Error checking quiz limit: {e}")
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500

    @app.route('/api/quiz/generate', methods=['POST'])
    @verify_firebase_token
    @rate_limit
    def generate_quiz():
        """
        Generate quiz questions using AI.
        Enforces daily AI quiz limit. Tracks usage in Firestore.

        Expected request body:
        {
            "grade": "10",
            "subject": "Mathematics",
            "topic": "Linear Equations",
            "difficulty": "Medium",
            "numQuestions": 10
        }
        """
        try:
            data = request.get_json()

            if not data:
                return jsonify({
                    'success': False,
                    'error': 'No request body provided'
                }), 400

            # Validate required fields
            required_fields = ['grade', 'subject', 'topic', 'difficulty', 'numQuestions']
            for field in required_fields:
                if field not in data:
                    return jsonify({
                        'success': False,
                        'error': f'Missing required field: {field}'
                    }), 400

            # Check daily AI quiz limit
            uid = request.user['uid']
            used, _ = _get_ai_quiz_usage(uid)

            if used >= AI_QUIZ_DAILY_LIMIT:
                resets_at = _get_midnight_ist_iso()
                logger.info(f"AI quiz limit reached for user {uid} ({used}/{AI_QUIZ_DAILY_LIMIT})")
                return jsonify({
                    'success': False,
                    'error': 'Daily AI quiz limit reached',
                    'code': 'AI_LIMIT_REACHED',
                    'used': used,
                    'limit': AI_QUIZ_DAILY_LIMIT,
                    'remaining': 0,
                    'resetsAt': resets_at
                }), 429

            # Import quiz generator
            from services.quiz_generator import get_quiz_generator

            # Get and validate parameters
            grade = validate_string(str(data['grade']), 'grade', 10)
            subject = validate_string(data['subject'], 'subject')
            topic = validate_string(data['topic'], 'topic')
            difficulty = validate_string(data['difficulty'], 'difficulty', 20)
            num_questions = int(data['numQuestions'])

            # Validate num_questions
            if num_questions < 1 or num_questions > 30:
                return jsonify({
                    'success': False,
                    'error': 'numQuestions must be between 1 and 30'
                }), 400

            logger.info(
                f"Quiz request: grade={grade}, subject={subject}, "
                f"topic={topic}, difficulty={difficulty}, count={num_questions}"
            )

            # Generate quiz
            generator = get_quiz_generator()
            questions = generator.generate_quiz(
                grade=grade,
                subject=subject,
                topic=topic,
                difficulty=difficulty,
                num_questions=num_questions
            )

            # Track AI quiz usage (only count if we actually called the API)
            _increment_ai_quiz_usage(uid)
            new_remaining = max(0, AI_QUIZ_DAILY_LIMIT - (used + 1))

            logger.info(f"Quiz generated: {len(questions)} questions for {subject} "
                        f"(AI usage: {used + 1}/{AI_QUIZ_DAILY_LIMIT})")

            return jsonify({
                'success': True,
                'questions': questions,
                'count': len(questions),
                'source': 'ai',
                'aiQuizRemaining': new_remaining
            })

        except ValueError as e:
            logger.error(f"Quiz config error: {e}")
            return jsonify({
                'success': False,
                'error': f'Configuration error: {str(e)}'
            }), 500
        except Exception as e:
            logger.error(f"Error generating quiz: {e}")
            return jsonify({
                'success': False,
                'error': f'Failed to generate quiz: {str(e)}'
            }), 500

    @app.route('/api/quiz/generate-bank', methods=['POST'])
    @verify_firebase_token
    @rate_limit
    def generate_bank_quiz():
        """
        Generate quiz from question bank only (no AI, no daily limit consumed).

        Expected request body:
        {
            "subject": "Mathematics",
            "topic": "Algebra",
            "difficulty": "Medium",
            "numQuestions": 10
        }
        """
        try:
            data = request.get_json()

            if not data:
                return jsonify({
                    'success': False,
                    'error': 'No request body provided'
                }), 400

            # Validate required fields
            required_fields = ['subject', 'difficulty', 'numQuestions']
            for field in required_fields:
                if field not in data:
                    return jsonify({
                        'success': False,
                        'error': f'Missing required field: {field}'
                    }), 400

            from services.quiz_generator import get_quiz_generator

            subject = validate_string(data['subject'], 'subject')
            topic = validate_string(data.get('topic', 'General'), 'topic')
            difficulty = validate_string(data['difficulty'], 'difficulty', 20)
            num_questions = int(data['numQuestions'])

            if num_questions < 1 or num_questions > 30:
                return jsonify({
                    'success': False,
                    'error': 'numQuestions must be between 1 and 30'
                }), 400

            logger.info(
                f"Bank quiz request: subject={subject}, "
                f"topic={topic}, difficulty={difficulty}, count={num_questions}"
            )

            generator = get_quiz_generator()
            questions = generator.generate_bank_quiz(
                subject=subject,
                topic=topic,
                difficulty=difficulty,
                num_questions=num_questions
            )

            logger.info(f"Bank quiz served: {len(questions)} questions for {subject}")

            return jsonify({
                'success': True,
                'questions': questions,
                'count': len(questions),
                'source': 'bank'
            })

        except Exception as e:
            logger.error(f"Error generating bank quiz: {e}")
            return jsonify({
                'success': False,
                'error': f'Failed to generate quiz: {str(e)}'
            }), 500

    # ==================== NOTIFICATIONS ====================

    @app.route('/api/notifications/register-device', methods=['POST'])
    @verify_firebase_token
    @rate_limit
    def register_device():
        """
        Register a device FCM token for push notifications
        
        Expected request body:
        {
            "fcmToken": "token_string",
            "deviceType": "web",
            "userAgent": "Mozilla/5.0..."
        }
        """
        try:
            from services.notifications import register_device_token

            data = request.get_json()
            
            if not data or 'fcmToken' not in data:
                return jsonify({
                    'success': False,
                    'error': 'Missing fcmToken in request'
                }), 400

            uid = getattr(request, 'user', {}).get('uid')
            if not uid:
                return jsonify({
                    'success': False,
                    'error': 'Unauthorized'
                }), 401

            fcm_token = validate_string(data['fcmToken'], 'fcmToken', 500)
            device_type = validate_string(data.get('deviceType', 'web'), 'deviceType', 50)
            user_agent = validate_string(data.get('userAgent', ''), 'userAgent', 500)

            result = register_device_token(uid, fcm_token, device_type, user_agent)
            
            if result['success']:
                return jsonify(result), 200
            else:
                return jsonify(result), 500
        except Exception as e:
            logger.error(f"Error registering device: {e}")
            return jsonify({
                'success': False,
                'error': f'Failed to register device: {str(e)}'
            }), 500

    @app.route('/api/notifications/send-test', methods=['POST'])
    @verify_firebase_token
    @rate_limit
    def send_test_notification():
        """
        Send a test notification to the current user (for testing)
        
        Expected request body:
        {
            "title": "Test Notification",
            "body": "This is a test message"
        }
        """
        try:
            from services.notifications import send_notification

            data = request.get_json()
            uid = getattr(request, 'user', {}).get('uid')

            if not uid:
                return jsonify({
                    'success': False,
                    'error': 'Unauthorized'
                }), 401

            title = validate_string(data.get('title', 'Test Notification'), 'title', 200)
            body = validate_string(data.get('body', 'This is a test message'), 'body', 500)

            result = send_notification(uid, title, body)
            return jsonify(result), 200 if result.get('success') else 500
        except Exception as e:
            logger.error(f"Error sending test notification: {e}")
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500

    @app.route('/api/notifications/settings', methods=['GET', 'POST', 'PUT'])
    @verify_firebase_token
    def notification_settings():
        """
        Get or update user notification settings
        """
        try:
            from services.firestoreServices import saveSettings, getSettings

            uid = getattr(request, 'user', {}).get('uid')
            if not uid:
                return jsonify({
                    'success': False,
                    'error': 'Unauthorized'
                }), 401

            if request.method == 'GET':
                # Get notification settings
                settings = getSettings(uid)
                return jsonify(settings), 200

            else:  # POST or PUT
                # Update notification settings
                data = request.get_json()
                if data:
                    settings = saveSettings(uid, data)
                    return jsonify(settings), 200
                else:
                    return jsonify({
                        'success': False,
                        'error': 'No data provided'
                    }), 400

        except Exception as e:
            logger.error(f"Error managing notification settings: {e}")
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500

    # ==================== Error Handlers ====================

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            'error': 'Endpoint not found',
            'code': 'NOT_FOUND'
        }), 404

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({
            'error': 'Internal server error',
            'code': 'INTERNAL_ERROR'
        }), 500


# Create the application instance
app = create_app()


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
