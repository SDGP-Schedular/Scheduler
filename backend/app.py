"""
Scheduler Backend API
Flask server with Firebase Admin SDK integration
"""

import os
from flask import Flask, jsonify, request
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, firestore

from config import config
from middleware.auth import verify_firebase_token


def create_app(config_name=None):
    """Application factory for creating Flask app."""
    
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')
    
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    # Initialize CORS
    CORS(app, origins=app.config['CORS_ORIGINS'], supports_credentials=True)
    
    # Initialize Firebase Admin SDK
    initialize_firebase(app)
    
    # Register routes
    register_routes(app)
    
    return app


def initialize_firebase(app):
    """Initialize Firebase Admin SDK."""
    try:
        # Check if Firebase is already initialized
        firebase_admin.get_app()
    except ValueError:
        # Initialize Firebase
        service_account_path = app.config['FIREBASE_SERVICE_ACCOUNT_PATH']
        
        if os.path.exists(service_account_path):
            cred = credentials.Certificate(service_account_path)
            firebase_admin.initialize_app(cred)
            print(f"✅ Firebase initialized with service account: {service_account_path}")
        else:
            # For development without service account file
            # Firebase will use default credentials (e.g., GOOGLE_APPLICATION_CREDENTIALS env var)
            print(f"⚠️ Service account file not found at: {service_account_path}")
            print("   Firebase Admin SDK will use default credentials if available.")
            try:
                firebase_admin.initialize_app()
                print("✅ Firebase initialized with default credentials")
            except Exception as e:
                print(f"❌ Failed to initialize Firebase: {e}")
                print("   Please provide a valid service account file to enable authentication.")


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
                'verify_token': '/api/auth/verify (protected)'
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
