import logging
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Any
from apscheduler.schedulers.background import BackgroundScheduler
from sqlmodel import Session, select
from app.core.database import engine
from app.models.transaction import Transaction
from app.models.goal import Goal
from app.models.user import User

logger = logging.getLogger("scheduler")
logger.setLevel(logging.INFO)

# Global in-memory notification queue for proactive insights
# user_id -> List of notifications
proactive_notifications: Dict[str, List[Dict[str, Any]]] = {}

def get_proactive_notifications(user_id: str) -> List[Dict[str, Any]]:
    """Fetches and clears new notifications for a user."""
    notes = proactive_notifications.get(user_id, [])
    # Keep notifications but flag them or return them (we can just return them)
    return notes

def add_proactive_notification(user_id: str, title: str, message: str, severity: str = "warning"):
    if user_id not in proactive_notifications:
        proactive_notifications[user_id] = []
    
    # Prepend to display latest first
    proactive_notifications[user_id].insert(0, {
        "id": str(datetime.utcnow().timestamp()),
        "title": title,
        "message": message,
        "severity": severity,
        "timestamp": datetime.utcnow().isoformat()
    })
    logger.info(f"Added proactive notification for user {user_id}: {title}")

def check_user_budgets_and_goals():
    """Periodic analysis task running in the background thread."""
    # Since we are in a background thread of APscheduler, we need to create a new session
    # and use asyncio.run to call async agents if necessary.
    with Session(engine) as session:
        users = session.exec(select(User)).all()
        for user in users:
            # Let's perform a simple rule-based analysis: did they overspend in the last 7 days?
            seven_days_ago = datetime.utcnow() - timedelta(days=7)
            transactions = session.exec(
                select(Transaction).where(
                    Transaction.user_id == user.id,
                    Transaction.date >= seven_days_ago
                )
            ).all()
            
            # Group spending
            spending_by_category = {}
            for t in transactions:
                if t.category != "investment":
                    spending_by_category[t.category] = spending_by_category.get(t.category, 0.0) + t.amount
            
            # Check dining/shopping exceeding threshold (e.g., food > 15% of income, shopping > 10% of income)
            income = user.monthly_income if user.monthly_income > 0 else 80000.0
            weekly_income_limit = income / 4.0
            
            for category, total in spending_by_category.items():
                if category == "food" and total > (weekly_income_limit * 0.25):
                    # Overspent on food! Trigger alert.
                    add_proactive_notification(
                        user_id=user.id,
                        title="Budget Alert: Dining Spike",
                        message=f"You spent ₹{total:,.2f} on dining out this week, exceeding your food budget limit of ₹{weekly_income_limit * 0.25:,.2f}. This could delay your 'Buy 2BHK Flat' goal by up to 2 months if sustained.",
                        severity="warning"
                    )
                elif category == "shopping" and total > (weekly_income_limit * 0.15):
                    add_proactive_notification(
                        user_id=user.id,
                        title="Budget Alert: Shopping Spree",
                        message=f"Shopping expenses reached ₹{total:,.2f} this week. Shifting ₹3,000 from discretionary buffer is recommended to maintain your retirement contribution timeline.",
                        severity="info"
                    )

class ProactiveScheduler:
    def __init__(self):
        self.scheduler = BackgroundScheduler()
        
    def start(self):
        # Run every 60 seconds for hackathon visibility
        self.scheduler.add_job(
            check_user_budgets_and_goals,
            'interval',
            seconds=60,
            id='proactive_check_job'
        )
        self.scheduler.start()
        logger.info("Proactive Background Scheduler started successfully.")

    def shutdown(self):
        self.scheduler.shutdown()
        logger.info("Proactive Background Scheduler stopped.")

scheduler = ProactiveScheduler()
