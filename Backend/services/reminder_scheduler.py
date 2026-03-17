"""
Notification Scheduler
Handles scheduling and sending of reminders and notifications based on user settings
"""

import logging
from datetime import datetime, time, timedelta, timezone
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from firebase_admin import firestore
from services.notifications import send_notification, log_notification

logger = logging.getLogger(__name__)

# Global scheduler instance
_scheduler = None


def _default_reminder_settings():
    return {
        'dailyReminders': {'enabled': True, 'time': '09:00'},
        'breakReminders': {'enabled': True, 'interval': '30'},
        'sessionAlerts': {'enabled': False, 'options': ['5_min']},
        'performanceNotifications': {'enabled': True, 'options': ['weekly_summary']},
        'preferences': {'sound': True, 'push': True, 'email': False},
        'quietHours': {'enabled': True, 'start': '22:00', 'end': '08:00'}
    }


def normalize_reminder_settings(raw_settings):
    settings = {**_default_reminder_settings(), **(raw_settings or {})}

    for key in ['dailyReminders', 'breakReminders', 'sessionAlerts', 'performanceNotifications', 'preferences', 'quietHours']:
        settings[key] = {**_default_reminder_settings()[key], **settings.get(key, {})}

    # Backward compatibility: main Settings page stores push/email under "notifications"
    notifications = settings.get('notifications', {}) if isinstance(settings.get('notifications', {}), dict) else {}
    if notifications.get('push') is not None:
        settings['preferences']['push'] = notifications.get('push')
    if notifications.get('email') is not None:
        settings['preferences']['email'] = notifications.get('email')

    return settings


def initialize_scheduler():
    """Initialize the background scheduler"""
    global _scheduler
    
    if _scheduler is None:
        try:
            _scheduler = BackgroundScheduler()
            _scheduler.start()
            logger.info("Notification scheduler initialized")
            
            # Add job to process reminders every minute
            _scheduler.add_job(
                process_scheduled_reminders,
                trigger='interval',
                minutes=1,
                id='process_reminders',
                name='Process scheduled reminders',
                replace_existing=True
            )
            
            logger.info("Reminder processing job scheduled")
        except Exception as e:
            logger.error(f"Error initializing scheduler: {e}")


def stop_scheduler():
    """Stop the scheduler"""
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown()
        logger.info("Notification scheduler stopped")


def process_scheduled_reminders():
    """
    Process all scheduled reminders and send notifications
    This is called every minute by the scheduler
    """
    try:
        db = firestore.client()
        current_time = datetime.now().astimezone()
        
        # Get all users
        users_ref = db.collection('users')
        
        for user_doc in users_ref.stream():
            uid = user_doc.id
            
            # Get user settings
            try:
                settings_doc = db.collection('users').document(uid).collection('data').document('settings').get()
                
                settings = normalize_reminder_settings(settings_doc.to_dict() if settings_doc.exists else {})
                
                # Check quiet hours
                if should_skip_notification(settings, current_time):
                    continue
                
                # Process daily reminders
                if settings.get('dailyReminders', {}).get('enabled'):
                    process_daily_reminder(uid, settings, current_time)
                
                # Process break reminders
                if settings.get('breakReminders', {}).get('enabled'):
                    process_break_reminder(uid, settings, current_time)
                
                # Process session alerts
                if settings.get('sessionAlerts', {}).get('enabled'):
                    process_session_alerts(uid, settings)
                
                # Process performance notifications
                if settings.get('performanceNotifications', {}).get('enabled'):
                    process_performance_notifications(uid, settings)
                    
            except Exception as e:
                logger.warning(f"Error processing reminders for user {uid}: {e}")
                continue
    
    except Exception as e:
        logger.error(f"Error in process_scheduled_reminders: {e}")


def should_skip_notification(settings, current_time):
    """Check if notification should be skipped due to quiet hours"""
    try:
        quiet_hours = settings.get('quietHours', {})
        if not quiet_hours.get('enabled'):
            return False
        
        start_time_str = quiet_hours.get('start', '22:00')
        end_time_str = quiet_hours.get('end', '08:00')
        
        start_hour, start_minute = map(int, start_time_str.split(':'))
        end_hour, end_minute = map(int, end_time_str.split(':'))
        
        current_hour = current_time.hour
        current_minute = current_time.minute
        current_mins = current_hour * 60 + current_minute
        
        start_mins = start_hour * 60 + start_minute
        end_mins = end_hour * 60 + end_minute
        
        # Handle overnight quiet hours (e.g., 22:00 to 08:00)
        if start_mins > end_mins:
            return current_mins >= start_mins or current_mins < end_mins
        else:
            return start_mins <= current_mins < end_mins
    except Exception as e:
        logger.warning(f"Error checking quiet hours: {e}")
        return False


def process_daily_reminder(uid, settings, current_time):
    """Process daily reminder if it's the scheduled time"""
    try:
        daily_settings = settings.get('dailyReminders', {})
        scheduled_time = daily_settings.get('time', '09:00')
        
        try:
            scheduled_hour = int(scheduled_time.split(':')[0])
        except:
            return
        
        # Check if it's the scheduled hour (server local timezone)
        if current_time.hour != scheduled_hour:
            return
        
        # Check if already sent today (using Firestore)
        db = firestore.client()
        reminder_log_ref = db.collection('users').document(uid).collection('reminderLogs').document('daily')
        log_doc = reminder_log_ref.get()
        
        today = current_time.strftime('%Y-%m-%d')
        
        if log_doc.exists:
            log_data = log_doc.to_dict() or {}
            last_sent = log_data.get('lastSent', '')
            if last_sent == today:
                return  # Already sent today
        
        # Send the reminder
        title = "Daily Reminder"
        body = "Check your study plan for today and get started!"
        
        preferences = settings.get('preferences', {})
        if preferences.get('push'):
            result = send_notification(uid, title, body, {
                'type': 'daily_reminder',
                'action': 'open_dashboard'
            })
            
            if result.get('success'):
                # Log the sent reminder
                reminder_log_ref.set({
                    'lastSent': today,
                    'timestamp': firestore.SERVER_TIMESTAMP
                })
                logger.info(f"Sent daily reminder to user {uid}")
    
    except Exception as e:
        logger.error(f"Error processing daily reminder for user {uid}: {e}")


def process_break_reminder(uid, settings, current_time):
    """Process break reminders based on interval"""
    try:
        break_settings = settings.get('breakReminders', {})
        interval = int(break_settings.get('interval', '30'))
        
        # Get last break reminder time
        db = firestore.client()
        reminder_log_ref = db.collection('users').document(uid).collection('reminderLogs').document('break')
        log_doc = reminder_log_ref.get()
        
        last_sent_time = None
        if log_doc.exists:
            last_ts = log_doc.get('lastSent')
            if last_ts:
                if getattr(last_ts, 'tzinfo', None) is None:
                    last_sent_time = last_ts.replace(tzinfo=timezone.utc)
                else:
                    last_sent_time = last_ts
                last_sent_time = last_sent_time.astimezone(current_time.tzinfo)
        
        # Check if enough time has passed since last reminder
        if last_sent_time:
            time_diff = current_time - last_sent_time
            if time_diff.total_seconds() < (interval * 60):
                return  # Not enough time has passed
        
        # Send break reminder
        title = "Time for a Break!"
        body = f"You've been studying for {interval} minutes. Take a short break to refresh."
        
        preferences = settings.get('preferences', {})
        if preferences.get('push'):
            result = send_notification(uid, title, body, {
                'type': 'break_reminder',
                'interval': str(interval)
            })
            
            if result.get('success'):
                reminder_log_ref.set({
                    'lastSent': firestore.SERVER_TIMESTAMP
                })
                logger.info(f"Sent break reminder to user {uid}")
    
    except Exception as e:
        logger.error(f"Error processing break reminder for user {uid}: {e}")


def process_session_alerts(uid, settings):
    """Process session start alerts based on study plan"""
    try:
        db = firestore.client()
        
        # Get user's study plan
        plan_doc = db.collection('users').document(uid).collection('data').document('studyPlan').get()
        if not plan_doc.exists:
            return
        
        study_plan = plan_doc.to_dict()
        sessions = study_plan.get('sessions', [])
        
        current_time = datetime.now().astimezone()
        session_alerts = settings.get('sessionAlerts', {}).get('options', [])
        preferences = settings.get('preferences', {})
        
        if not preferences.get('push'):
            return
        
        # Check each session
        for session in sessions:
            try:
                session_start_str = session.get('startTime', '')
                
                # Parse session start time
                session_start = datetime.fromisoformat(session_start_str.replace('Z', '+00:00'))
                if session_start.tzinfo is None:
                    session_start = session_start.replace(tzinfo=timezone.utc)
                session_start = session_start.astimezone(current_time.tzinfo)
                
                # Check for alerting windows
                for alert_type in session_alerts:
                    if alert_type == '5_min' and (session_start - timedelta(minutes=5)) <= current_time < (session_start - timedelta(minutes=4)):
                        send_notification(uid, 
                            "Session Starting Soon",
                            f"Your session '{session.get('subject', 'Study')}' starts in 5 minutes",
                            {'type': 'session_alert_5min'}
                        )
                    
                    elif alert_type == '15_min' and (session_start - timedelta(minutes=15)) <= current_time < (session_start - timedelta(minutes=14)):
                        send_notification(uid,
                            "Session in 15 Minutes",
                            f"Get ready for your session '{session.get('subject', 'Study')}'",
                            {'type': 'session_alert_15min'}
                        )
                    
                    elif alert_type == 'start_time' and abs((session_start - current_time).total_seconds()) < 60:
                        send_notification(uid,
                            "Session Starting Now",
                            f"Time to start your session '{session.get('subject', 'Study')}'",
                            {'type': 'session_alert_start'}
                        )
            except Exception as e:
                logger.warning(f"Error processing session {session}: {e}")
    
    except Exception as e:
        logger.error(f"Error processing session alerts for user {uid}: {e}")


def process_performance_notifications(uid, settings):
    """Process performance notifications (achievements, milestones, etc.)"""
    try:
        db = firestore.client()
        performance_opts = settings.get('performanceNotifications', {}).get('options', [])
        preferences = settings.get('preferences', {})
        
        if not preferences.get('push'):
            return
        
        # Weekly summary (every Monday at noon)
        if 'weekly_summary' in performance_opts:
            today = datetime.now().astimezone()
            if today.weekday() == 0 and today.hour == 12:  # Monday at noon
                # Check if already sent this week
                log_ref = db.collection('users').document(uid).collection('reminderLogs').document('weekly_summary')
                log_doc = log_ref.get()
                
                week_key = today.strftime('%Y-W%U')
                if log_doc.exists and log_doc.get('lastSent') == week_key:
                    return
                
                # Get progress stats
                progress_doc = db.collection('users').document(uid).collection('data').document('progress').get()
                if progress_doc.exists:
                    progress = progress_doc.to_dict()
                    xp = progress.get('xpPoints', 0)
                    streak = progress.get('studyStreak', 0)
                    
                    send_notification(uid,
                        "Weekly Study Summary",
                        f"Great week! {streak} day streak and {xp} XP earned.",
                        {'type': 'weekly_summary'}
                    )
                    
                    log_ref.set({'lastSent': week_key})
        
        # Milestone alerts
        if 'milestone_alerts' in performance_opts:
            progress_doc = db.collection('users').document(uid).collection('data').document('progress').get()
            if progress_doc.exists:
                progress = progress_doc.to_dict()
                xp = progress.get('xpPoints', 0)
                
                # Check for milestone achievements (100, 500, 1000, 5000 XP)
                milestones = [100, 500, 1000, 5000, 10000]
                for milestone in milestones:
                    if xp >= milestone:
                        milestone_key = f'milestone_{milestone}'
                        
                        # Check if already notified
                        log_ref = db.collection('users').document(uid).collection('reminderLogs').document(milestone_key)
                        if not log_ref.get().exists:
                            send_notification(uid,
                                f"Milestone Unlocked! 🎉",
                                f"You've reached {milestone} XP!",
                                {'type': 'milestone_alert', 'milestone': milestone}
                            )
                            log_ref.set({'achieved': firestore.SERVER_TIMESTAMP})
    
    except Exception as e:
        logger.error(f"Error processing performance notifications for user {uid}: {e}")
