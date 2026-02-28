from functools import wraps
from flask import request, jsonify
import firebase_admin.auth as firebase_auth


def verify_firebase_token(f):
    """
    Decorator to verify Firebase ID token from Authorization header.
    
    Usage:
        @app.route('/protected')
        @verify_firebase_token
        def protected_route():
            # Access user info via request.user
            user_id = request.user['uid']
            return jsonify({'message': f'Hello, {user_id}'})
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Get the Authorization header
        auth_header = request.headers.get('Authorization')
        
        if not auth_header:
            return jsonify({
                'error': 'Authorization header is missing',
                'code': 'AUTH_HEADER_MISSING'
            }), 401
        
        # Check for Bearer token format
        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            return jsonify({
                'error': 'Invalid authorization header format. Use: Bearer <token>',
                'code': 'INVALID_AUTH_FORMAT'
            }), 401
        
        token = parts[1]
        
        try:
            # Verify the Firebase ID token
            decoded_token = firebase_auth.verify_id_token(token)
            
            # Attach user info to request object
            request.user = {
                'uid': decoded_token['uid'],
                'email': decoded_token.get('email'),
                'email_verified': decoded_token.get('email_verified', False),
                'name': decoded_token.get('name'),
                'picture': decoded_token.get('picture'),
                'provider': decoded_token.get('firebase', {}).get('sign_in_provider')
            }
            
            return f(*args, **kwargs)
            
        except firebase_auth.ExpiredIdTokenError:
            return jsonify({
                'error': 'Token has expired',
                'code': 'TOKEN_EXPIRED'
            }), 401
            
        except firebase_auth.RevokedIdTokenError:
            return jsonify({
                'error': 'Token has been revoked',
                'code': 'TOKEN_REVOKED'
            }), 401
            
        except firebase_auth.InvalidIdTokenError:
            return jsonify({
                'error': 'Invalid token',
                'code': 'INVALID_TOKEN'
            }), 401
            
        except Exception as e:
            return jsonify({
                'error': 'Token verification failed',
                'code': 'VERIFICATION_FAILED',
                'details': str(e)
            }), 401
    
    return decorated_function


def get_user_from_token(token):
    """
    Verify a Firebase token and return user info.
    
    Args:
        token: Firebase ID token string
        
    Returns:
        dict: User information if valid, None otherwise
    """
    try:
        decoded_token = firebase_auth.verify_id_token(token)
        return {
            'uid': decoded_token['uid'],
            'email': decoded_token.get('email'),
            'email_verified': decoded_token.get('email_verified', False),
            'name': decoded_token.get('name'),
            'picture': decoded_token.get('picture')
        }
    except Exception:
        return None
