import logging
from typing import List, Dict, Any
from google.adk import Agent
from sqlmodel import Session, select
from app.core.database import engine
from app.models.transaction import Transaction

logger = logging.getLogger("agents.budget")

def get_user_transactions(user_id: str) -> List[Dict[str, Any]]:
    """Fetches user transaction history from the SQLite database."""
    with Session(engine) as session:
        statement = select(Transaction).where(Transaction.user_id == user_id)
        results = session.exec(statement).all()
        return [
            {
                "id": t.id,
                "amount": t.amount,
                "category": t.category,
                "description": t.description,
                "date": t.date.isoformat(),
                "is_recurring": t.is_recurring
            } for t in results
        ]

def get_budget_summary(user_id: str) -> Dict[str, Any]:
    """Calculates summary of expenses grouped by category, total outgoings, and active cash surplus."""
    with Session(engine) as session:
        statement = select(Transaction).where(Transaction.user_id == user_id)
        transactions = session.exec(statement).all()
        
        totals = {}
        total_expense = 0.0
        total_investment = 0.0
        
        for t in transactions:
            if t.category == "investment":
                total_investment += t.amount
            else:
                totals[t.category] = totals.get(t.category, 0.0) + t.amount
                total_expense += t.amount
                
        return {
            "categories": totals,
            "total_expenses": total_expense,
            "total_investments": total_investment
        }

# Define BudgetAgent
budget_agent = Agent(
    name="BudgetAgent",
    model="gemini-2.5-flash",
    instruction="""
    You are Sophium's BudgetAgent. Your role is to examine user spending patterns, categorize transaction logs, and assess cash flow margins.
    Use get_user_transactions and get_budget_summary to obtain financial data.
    Identify:
    - Top discretionary spending areas (e.g., shopping, dining).
    - Monthly cash flow surplus (Income - Expenses).
    - Unnecessary recurring charges or patterns.
    
    Structure your assessment clearly as markdown, specifying exact amounts.
    """,
    tools=[get_user_transactions, get_budget_summary]
)
