"""
Notification Service
Handles Firebase Cloud Messaging (FCM) and notification management
"""

import logging
from datetime import datetime
from firebase_admin import firestore, messaging

logger = logging.getLogger(__name__)


def register_device_token(uid, fcm_token, device_type='web', user_agent=''):
    """
    Register a device FCM token in Firestore for push notifications
    
    Args:
        uid: Firebase UID of the user
        fcm_token: Firebase Cloud Messaging token
        device_type: Type of device ('web', 'mobile', etc.)
        user_agent: User agent string from the device
    
    Returns:
        dict with success status and message
    """
    try:
        db = firestore.client()
        
        # Store/update the device token in Firestore
        device_ref = db.collection('users').document(uid).collection('devices').document(fcm_token)
        device_ref.set({
            'fcmToken': fcm_token,
            'deviceType': device_type,
            'userAgent': user_agent,
            'registeredAt': firestore.SERVER_TIMESTAMP,
            'lastSeen': firestore.SERVER_TIMESTAMP,
            'active': True
        }, merge=True)
        
        logger.info(f"Registered device token for user {uid}")
        return {
            'success': True,
            'message': 'Device token registered successfully'
        }
    except Exception as e:
        logger.error(f"Error registering device token for user {uid}: {e}")
        return {
            'success': False,
            'error': str(e)
        }


def send_notification(uid, title, body, data=None, fcm_token=None):
    """
    Send a push notification to a specific user or device
    
    Args:
        uid: Firebase UID of the user
        title: Notification title
        body: Notification body/message
        data: Optional dict of additional data to send
        fcm_token: Specific FCM token (optional, if not provided, will try all tokens)
    
    Returns:
        dict with success status
    """
    try:
        if not fcm_token:
            # Get all active device tokens for the user
            db = firestore.client()
            devices_ref = db.collection('users').document(uid).collection('devices')
            devices = devices_ref.where('active', '==', True).stream()
            
            fcm_tokens = [doc.get('fcmToken') for doc in devices]
            
            if not fcm_tokens:
                logger.warning(f"No active devices found for user {uid}")
                return {
                    'success': False,
                    'error': 'No active devices registered'
                }
        else:
            fcm_tokens = [fcm_token]
        
        # Build the notification message
        message_data = data or {}
        notification = messaging.Notification(
            title=title,
            body=body
        )
        
        results = {
            'success': True,
            'sent': 0,
            'failed': 0,
            'errors': []
        }
        
        # Send to each device
        for token in fcm_tokens:
            try:
                message = messaging.Message(
                    token=token,
                    notification=notification,
                    data=message_data,
                    android=messaging.AndroidConfig(
                        priority='high',
                        notification=messaging.AndroidNotification(
                            title=title,
                            body=body,
                            sound='default',
                            click_action='FLUTTER_NOTIFICATION_CLICK'
                        )
                    ),
                    apns=messaging.APNSConfig(
                        payload=messaging.APNSPayload(
                            aps=messaging.Aps(
                                alert=messaging.ApsAlert(
                                    title=title,
                                    body=body
                                ),
                                sound='default',
                                badge=1
                            )
                        )
                    ),
                    webpush=messaging.WebpushConfig(
                        notification=messaging.WebpushNotification(
                            title=title,
                            body=body,
                            icon='/scheduler-icon.png',
                            badge='/scheduler-badge.png'
                        ),
                        data=message_data
                    )
                )
                
                response = messaging.send(message)
                results['sent'] += 1
                logger.info(f"Sent notification to {token}: {response}")
            except Exception as e:
                results['failed'] += 1
                results['errors'].append(str(e))
                logger.error(f"Error sending notification to {token}: {e}")

        try:
            log_notification(uid, title, body, results['sent'], results['failed'])
        except Exception as log_err:
            logger.warning(f"Could not write notification log for user {uid}: {log_err}")
        
        return results
    except Exception as e:
        logger.error(f"Error sending notification to user {uid}: {e}")
        return {
            'success': False,
            'error': str(e)
        }


def send_bulk_notification(user_ids, title, body, data=None):
    """
    Send a notification to multiple users
    
    Args:
        user_ids: List of Firebase UIDs
        title: Notification title
        body: Notification body
        data: Optional dict of additional data
    
    Returns:
        dict with summary of results
    """
    results = {
        'total': len(user_ids),
        'sent': 0,
        'failed': 0,
        'errors': []
    }
    
    for uid in user_ids:
        result = send_notification(uid, title, body, data)
        if result.get('success'):
            results['sent'] += 1
        else:
            results['failed'] += 1
            results['errors'].append({
                'uid': uid,
                'error': result.get('error', 'Unknown error')
            })
    
    return results


def deregister_device_token(uid, fcm_token):
    """
    Deregister a device token (mark as inactive)
    
    Args:
        uid: Firebase UID
        fcm_token: Token to deregister
    
    Returns:
        dict with success status
    """
    try:
        db = firestore.client()
        device_ref = db.collection('users').document(uid).collection('devices').document(fcm_token)
        device_ref.update({
            'active': False,
            'deregisteredAt': firestore.SERVER_TIMESTAMP
        })
        
        logger.info(f"Deregistered device token for user {uid}")
        return {
            'success': True,
            'message': 'Device token deregistered'
        }
    except Exception as e:
        logger.error(f"Error deregistering device token for user {uid}: {e}")
        return {
            'success': False,
            'error': str(e)
        }


def log_notification(uid, title, body, sent_count, failed_count):
    """
    Log sent notifications for analytics
    
    Args:
        uid: User ID
        title: Notification title
        body: Notification body
        sent_count: Number of devices notification was sent to
        failed_count: Number of devices that failed
    """
    try:
        db = firestore.client()
        notification_log_ref = db.collection('users').document(uid).collection('notificationLogs').document()
        notification_log_ref.set({
            'title': title,
            'body': body,
            'sentCount': sent_count,
            'failedCount': failed_count,
            'sentAt': firestore.SERVER_TIMESTAMP,
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Error logging notification: {e}")
