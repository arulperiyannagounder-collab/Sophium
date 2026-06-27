import logging
from typing import Dict, List, Any
from google.adk import Agent

logger = logging.getLogger("agents.simulation")

def simulate_compound_interest(monthly_deposit: float, annual_rate: float, years: int) -> Dict[str, Any]:
    """Calculates compound interest trajectory with monthly deposits.
    
    Returns:
        A dictionary with cumulative savings, interest earned, and raw plot points.
    """
    monthly_rate = (annual_rate / 100.0) / 12.0
    months = years * 12
    total_savings = 0.0
    total_invested = 0.0
    plot_points = []
    
    for month in range(1, months + 1):
        total_savings = (total_savings + monthly_deposit) * (1 + monthly_rate)
        total_invested += monthly_deposit
        
        # Capture yearly points to limit payload size
        if month % 12 == 0 or month == months:
            plot_points.append({
                "year": month // 12,
                "total_wealth": round(total_savings, 2),
                "total_invested": round(total_invested, 2),
                "interest_earned": round(total_savings - total_invested, 2)
            })
            
    return {
        "final_value": round(total_savings, 2),
        "total_invested": round(total_invested, 2),
        "interest_earned": round(total_savings - total_invested, 2),
        "chart_data": plot_points
    }

def simulate_mortgage(loan_amount: float, annual_rate: float, years: int) -> Dict[str, Any]:
    """Calculates monthly EMI and amortization projections for a home purchase."""
    r = (annual_rate / 100.0) / 12.0
    n = years * 12
    # EMI formula: EMI = [P x R x (1+R)^N]/[((1+R)^N)-1]
    if r == 0:
        emi = loan_amount / n
    else:
        emi = (loan_amount * r * ((1 + r) ** n)) / (((1 + r) ** n) - 1)
        
    total_payment = emi * n
    total_interest = total_payment - loan_amount
    
    return {
        "monthly_emi": round(emi, 2),
        "total_payment": round(total_payment, 2),
        "total_interest": round(total_interest, 2)
    }

# Define SimulationAgent
simulation_agent = Agent(
    name="SimulationAgent",
    model="gemini-2.5-flash",
    instruction="""
    You are Sophium's SimulationAgent. Your role is to compute projections for sandbox scenarios.
    Use simulate_compound_interest and simulate_mortgage tools.
    You answer questions like:
    - "What if I invest ₹10,000 monthly?"
    - "What if I buy a house for ₹50L with a 15-year mortgage?"
    
    Always return details of the calculations, and output a structured list of yearly values so the Coordinator can pass it to the frontend.
    """,
    tools=[simulate_compound_interest, simulate_mortgage]
)
