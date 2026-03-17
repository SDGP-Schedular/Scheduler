"""
Firestore service for notification settings (Python backend version)
"""

import logging
from firebase_admin import firestore

logger = logging.getLogger(__name__)


def getSettings(uid: str) -> dict:
    """Get notification settings for a user from Firestore."""
    try:
        db = firestore.client()
        settings_ref = db.collection('users').document(uid).collection('data').document('settings')
        settings_doc = settings_ref.get()

        if settings_doc.exists:
            return {
                'success': True,
                'settings': settings_doc.to_dict()
            }
        else:
            # Return default settings if none exist
            default_settings = {
                'dailyReminders': {'enabled': True, 'time': '09:00'},
                'breakReminders': {'enabled': True, 'interval': '30'},
                'sessionAlerts': {'enabled': False, 'options': ['5_min']},
                'performanceNotifications': {'enabled': True, 'options': ['weekly_summary']},
                'preferences': {'sound': True, 'push': True, 'email': False},
                'quietHours': {'enabled': True, 'start': '22:00', 'end': '08:00'}
            }
            return {
                'success': True,
                'settings': default_settings
            }

    except Exception as e:
        logger.error(f"Error getting notification settings for {uid}: {e}")
        return {
            'success': False,
            'error': str(e)
        }


def saveSettings(uid: str, data: dict) -> dict:
    """Save notification settings for a user to Firestore."""
    try:
        db = firestore.client()
        settings_ref = db.collection('users').document(uid).collection('data').document('settings')

        # Add server timestamp
        data['updatedAt'] = firestore.SERVER_TIMESTAMP

        settings_ref.set(data, merge=True)

        return {
            'success': True,
            'message': 'Settings saved successfully',
            'settings': data
        }

    except Exception as e:
        logger.error(f"Error saving notification settings for {uid}: {e}")
        return {
            'success': False,
            'error': str(e)
        }