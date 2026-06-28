import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

from app.api.auth import get_current_user
from app.models.user import User
from app.models.income import Income
from app.models.investment import Investment
from app.models.asset import Asset
from app.models.liability import Liability
from app.models.transaction import Transaction
from app.core.database import get_session
from app.services.qdrant_service import qdrant_service
from app.core.response import make_response, StandardResponse

logger = logging.getLogger("api.financials")
router = APIRouter(prefix="/financials", tags=["financials"])

# --- Schemas ---

class IncomeCreate(BaseModel):
    amount: float
    category: str # salary, business, freelance, interest, rental, other
    description: Optional[str] = None
    date: Optional[datetime] = None

class IncomeUpdate(BaseModel):
    amount: Optional[float] = None
    category: Optional[str] = None
    description: Optional[str] = None
    date: Optional[datetime] = None

class InvestmentCreate(BaseModel):
    name: str
    amount: float
    category: str # Mutual Funds, Stocks, FD, Gold, Crypto, Bonds, PPF, EPF
    description: Optional[str] = None
    date: Optional[datetime] = None

class InvestmentUpdate(BaseModel):
    name: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[str] = None
    description: Optional[str] = None
    date: Optional[datetime] = None

class AssetCreate(BaseModel):
    name: str
    value: float
    category: str # House, Car, Cash, Bank, Land, Gold, Digital Assets
    description: Optional[str] = None

class AssetUpdate(BaseModel):
    name: Optional[str] = None
    value: Optional[float] = None
    category: Optional[str] = None
    description: Optional[str] = None

class LiabilityCreate(BaseModel):
    name: str
    amount: float
    category: str # Home Loan, Car Loan, Personal Loan, Education Loan, Credit Card
    description: Optional[str] = None

class LiabilityUpdate(BaseModel):
    name: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[str] = None
    description: Optional[str] = None

# --- Sync helpers ---

def sync_income_memory(inc: Income):
    content = (
        f"Financial Income Source Log: Category: {inc.category}. "
        f"Amount: {inc.amount} INR. Transaction Date: {inc.date.isoformat()}. "
        f"Description: {inc.description or 'N/A'}."
    )
    qdrant_service.store_memory(
        user_id=inc.user_id,
        memory_type="financial_profile",
        category=inc.category,
        content=content,
        importance=4,
        metadata={"income_id": inc.id}
    )

def delete_income_memory(inc_id: str, user_id: str):
    qdrant_service.delete_memories_by_filter(
        user_id=user_id,
        memory_type="financial_profile",
        metadata_filter={"income_id": inc_id}
    )

def sync_investment_memory(inv: Investment):
    content = (
        f"Financial Investment Asset: Name: {inv.name}. Category: {inv.category}. "
        f"Current Investment Value: {inv.amount} INR. Date: {inv.date.isoformat()}. "
        f"Description: {inv.description or 'N/A'}."
    )
    qdrant_service.store_memory(
        user_id=inv.user_id,
        memory_type="financial_profile",
        category=inv.category,
        content=content,
        importance=4,
        metadata={"investment_id": inv.id}
    )

def delete_investment_memory(inv_id: str, user_id: str):
    qdrant_service.delete_memories_by_filter(
        user_id=user_id,
        memory_type="financial_profile",
        metadata_filter={"investment_id": inv_id}
    )

def sync_asset_memory(asset: Asset):
    content = (
        f"Financial Asset Valuation: Name: {asset.name}. Category: {asset.category}. "
        f"Estimated Valuation: {asset.value} INR. "
        f"Description: {asset.description or 'N/A'}."
    )
    qdrant_service.store_memory(
        user_id=asset.user_id,
        memory_type="financial_profile",
        category=asset.category,
        content=content,
        importance=4,
        metadata={"asset_id": asset.id}
    )

def delete_asset_memory(asset_id: str, user_id: str):
    qdrant_service.delete_memories_by_filter(
        user_id=user_id,
        memory_type="financial_profile",
        metadata_filter={"asset_id": asset_id}
    )

def sync_liability_memory(liab: Liability):
    content = (
        f"Financial Liability/Outstanding Debt: Name: {liab.name}. Category: {liab.category}. "
        f"Current Outstanding Balance: {liab.amount} INR. "
        f"Description: {liab.description or 'N/A'}."
    )
    qdrant_service.store_memory(
        user_id=liab.user_id,
        memory_type="financial_profile",
        category=liab.category,
        content=content,
        importance=4,
        metadata={"liability_id": liab.id}
    )

def delete_liability_memory(liab_id: str, user_id: str):
    qdrant_service.delete_memories_by_filter(
        user_id=user_id,
        memory_type="financial_profile",
        metadata_filter={"liability_id": liab_id}
    )

# --- Summary API ---

@router.get("/summary", response_model=StandardResponse)
def get_financial_summary(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Computes active monthly cash flows, net worth calculations, assets, and liabilities values."""
    try:
        now = datetime.utcnow()
        current_month = now.month
        current_year = now.year
        
        # 1. Monthly income
        # Fetch current month logged income
        incomes = session.exec(
            select(Income).where(Income.user_id == current_user.id)
        ).all()
        
        monthly_income_sum = 0.0
        for inc in incomes:
            if inc.date.month == current_month and inc.date.year == current_year:
                monthly_income_sum += inc.amount
                
        # If no income logged for this month, fallback to user.monthly_income profile baseline
        if monthly_income_sum == 0.0:
            monthly_income_sum = current_user.monthly_income

        # 2. Monthly expense
        transactions = session.exec(
            select(Transaction).where(
                Transaction.user_id == current_user.id,
                Transaction.type == "expense"
            )
        ).all()
        
        monthly_expense_sum = 0.0
        for tx in transactions:
            if tx.date.month == current_month and tx.date.year == current_year:
                monthly_expense_sum += tx.amount
                
        # 3. Total assets value
        assets = session.exec(select(Asset).where(Asset.user_id == current_user.id)).all()
        asset_sum = sum(a.value for a in assets)
        
        # Include investments in total assets
        investments = session.exec(select(Investment).where(Investment.user_id == current_user.id)).all()
        investment_sum = sum(i.amount for i in investments)
        total_assets = asset_sum + investment_sum

        # 4. Total liabilities value
        liabilities = session.exec(select(Liability).where(Liability.user_id == current_user.id)).all()
        liability_sum = sum(l.amount for l in liabilities)

        savings = monthly_income_sum - monthly_expense_sum
        net_worth = total_assets - liability_sum

        payload = {
            "monthly_income": monthly_income_sum,
            "monthly_expense": monthly_expense_sum,
            "savings": savings,
            "net_worth": net_worth,
            "asset_value": total_assets,
            "liability_value": liability_sum,
            "details": {
                "liquid_assets": asset_sum,
                "investment_assets": investment_sum
            }
        }
        
        return make_response(
            success=True,
            message="Financial summary calculated successfully",
            data=payload
        )
    except Exception as e:
        logger.error(f"Error calculating financial summary: {e}")
        raise HTTPException(status_code=500, detail=f"Summary calculation failed: {str(e)}")


# --- Income CRUD ---

@router.get("/income", response_model=StandardResponse)
def list_incomes(
    limit: int = 50,
    offset: int = 0,
    category: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = None,
    order: str = "desc",
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    try:
        statement = select(Income).where(Income.user_id == current_user.id)
        if category:
            statement = statement.where(Income.category == category)
        if start_date:
            statement = statement.where(Income.date >= start_date)
        if end_date:
            statement = statement.where(Income.date <= end_date)
        if search:
            statement = statement.where(Income.description.like(f"%{search}%"))
            
        if sort_by:
            field = getattr(Income, sort_by, None)
            if field:
                statement = statement.order_by(field.desc() if order == "desc" else field.asc())
        else:
            statement = statement.order_by(Income.date.desc())
            
        statement = statement.offset(offset).limit(limit)
        results = session.exec(statement).all()
        return make_response(success=True, message="Incomes retrieved successfully", data=results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/income", response_model=StandardResponse)
def create_income(
    body: IncomeCreate, 
    current_user: User = Depends(get_current_user), 
    session: Session = Depends(get_session)
):
    try:
        inc = Income(
            user_id=current_user.id,
            amount=body.amount,
            category=body.category,
            description=body.description,
            date=body.date if body.date else datetime.utcnow()
        )
        session.add(inc)
        session.commit()
        session.refresh(inc)
        
        sync_income_memory(inc)
        
        return make_response(success=True, message="Income registered successfully", data=inc)
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/income/{income_id}", response_model=StandardResponse)
def update_income(
    income_id: str,
    body: IncomeUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    try:
        inc = session.get(Income, income_id)
        if not inc or inc.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Income record not found")
            
        if body.amount is not None:
            inc.amount = body.amount
        if body.category is not None:
            inc.category = body.category
        if body.description is not None:
            inc.description = body.description
        if body.date is not None:
            inc.date = body.date
            
        inc.updated_at = datetime.utcnow()
        session.add(inc)
        session.commit()
        session.refresh(inc)
        
        sync_income_memory(inc)
        
        return make_response(success=True, message="Income updated successfully", data=inc)
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/income/{income_id}", response_model=StandardResponse)
def delete_income(
    income_id: str, 
    current_user: User = Depends(get_current_user), 
    session: Session = Depends(get_session)
):
    try:
        inc = session.get(Income, income_id)
        if not inc or inc.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Income record not found")
            
        session.delete(inc)
        session.commit()
        
        delete_income_memory(income_id, current_user.id)
        
        return make_response(success=True, message="Income record deleted successfully")
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# --- Investment CRUD ---

@router.get("/investments", response_model=StandardResponse)
def list_investments(
    limit: int = 50,
    offset: int = 0,
    category: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = None,
    order: str = "desc",
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    try:
        statement = select(Investment).where(Investment.user_id == current_user.id)
        if category:
            statement = statement.where(Investment.category == category)
        if search:
            statement = statement.where(
                (Investment.name.like(f"%{search}%")) | (Investment.description.like(f"%{search}%"))
            )
            
        if sort_by:
            field = getattr(Investment, sort_by, None)
            if field:
                statement = statement.order_by(field.desc() if order == "desc" else field.asc())
        else:
            statement = statement.order_by(Investment.date.desc())
            
        statement = statement.offset(offset).limit(limit)
        results = session.exec(statement).all()
        return make_response(success=True, message="Investments retrieved successfully", data=results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/investments", response_model=StandardResponse)
def create_investment(
    body: InvestmentCreate, 
    current_user: User = Depends(get_current_user), 
    session: Session = Depends(get_session)
):
    try:
        inv = Investment(
            user_id=current_user.id,
            name=body.name,
            amount=body.amount,
            category=body.category,
            description=body.description,
            date=body.date if body.date else datetime.utcnow()
        )
        session.add(inv)
        session.commit()
        session.refresh(inv)
        
        sync_investment_memory(inv)
        
        return make_response(success=True, message="Investment created successfully", data=inv)
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/investments/{inv_id}", response_model=StandardResponse)
def update_investment(
    inv_id: str,
    body: InvestmentUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    try:
        inv = session.get(Investment, inv_id)
        if not inv or inv.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Investment not found")
            
        if body.name is not None:
            inv.name = body.name
        if body.amount is not None:
            inv.amount = body.amount
        if body.category is not None:
            inv.category = body.category
        if body.description is not None:
            inv.description = body.description
        if body.date is not None:
            inv.date = body.date
            
        inv.updated_at = datetime.utcnow()
        session.add(inv)
        session.commit()
        session.refresh(inv)
        
        sync_investment_memory(inv)
        
        return make_response(success=True, message="Investment updated successfully", data=inv)
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/investments/{inv_id}", response_model=StandardResponse)
def delete_investment(
    inv_id: str, 
    current_user: User = Depends(get_current_user), 
    session: Session = Depends(get_session)
):
    try:
        inv = session.get(Investment, inv_id)
        if not inv or inv.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Investment not found")
            
        session.delete(inv)
        session.commit()
        
        delete_investment_memory(inv_id, current_user.id)
        
        return make_response(success=True, message="Investment deleted successfully")
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# --- Asset CRUD ---

@router.get("/assets", response_model=StandardResponse)
def list_assets(
    limit: int = 50,
    offset: int = 0,
    category: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = None,
    order: str = "desc",
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    try:
        statement = select(Asset).where(Asset.user_id == current_user.id)
        if category:
            statement = statement.where(Asset.category == category)
        if search:
            statement = statement.where(
                (Asset.name.like(f"%{search}%")) | (Asset.description.like(f"%{search}%"))
            )
            
        if sort_by:
            field = getattr(Asset, sort_by, None)
            if field:
                statement = statement.order_by(field.desc() if order == "desc" else field.asc())
        else:
            statement = statement.order_by(Asset.updated_at.desc())
            
        statement = statement.offset(offset).limit(limit)
        results = session.exec(statement).all()
        return make_response(success=True, message="Assets retrieved successfully", data=results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/assets", response_model=StandardResponse)
def create_asset(
    body: AssetCreate, 
    current_user: User = Depends(get_current_user), 
    session: Session = Depends(get_session)
):
    try:
        asset = Asset(
            user_id=current_user.id,
            name=body.name,
            value=body.value,
            category=body.category,
            description=body.description
        )
        session.add(asset)
        session.commit()
        session.refresh(asset)
        
        sync_asset_memory(asset)
        
        return make_response(success=True, message="Asset created successfully", data=asset)
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/assets/{asset_id}", response_model=StandardResponse)
def update_asset(
    asset_id: str,
    body: AssetUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    try:
        asset = session.get(Asset, asset_id)
        if not asset or asset.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Asset not found")
            
        if body.name is not None:
            asset.name = body.name
        if body.value is not None:
            asset.value = body.value
        if body.category is not None:
            asset.category = body.category
        if body.description is not None:
            asset.description = body.description
            
        asset.updated_at = datetime.utcnow()
        session.add(asset)
        session.commit()
        session.refresh(asset)
        
        sync_asset_memory(asset)
        
        return make_response(success=True, message="Asset updated successfully", data=asset)
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/assets/{asset_id}", response_model=StandardResponse)
def delete_asset(
    asset_id: str, 
    current_user: User = Depends(get_current_user), 
    session: Session = Depends(get_session)
):
    try:
        asset = session.get(Asset, asset_id)
        if not asset or asset.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Asset not found")
            
        session.delete(asset)
        session.commit()
        
        delete_asset_memory(asset_id, current_user.id)
        
        return make_response(success=True, message="Asset deleted successfully")
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# --- Liability CRUD ---

@router.get("/liabilities", response_model=StandardResponse)
def list_liabilities(
    limit: int = 50,
    offset: int = 0,
    category: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = None,
    order: str = "desc",
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    try:
        statement = select(Liability).where(Liability.user_id == current_user.id)
        if category:
            statement = statement.where(Liability.category == category)
        if search:
            statement = statement.where(
                (Liability.name.like(f"%{search}%")) | (Liability.description.like(f"%{search}%"))
            )
            
        if sort_by:
            field = getattr(Liability, sort_by, None)
            if field:
                statement = statement.order_by(field.desc() if order == "desc" else field.asc())
        else:
            statement = statement.order_by(Liability.updated_at.desc())
            
        statement = statement.offset(offset).limit(limit)
        results = session.exec(statement).all()
        return make_response(success=True, message="Liabilities retrieved successfully", data=results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/liabilities", response_model=StandardResponse)
def create_liability(
    body: LiabilityCreate, 
    current_user: User = Depends(get_current_user), 
    session: Session = Depends(get_session)
):
    try:
        liab = Liability(
            user_id=current_user.id,
            name=body.name,
            amount=body.amount,
            category=body.category,
            description=body.description
        )
        session.add(liab)
        session.commit()
        session.refresh(liab)
        
        sync_liability_memory(liab)
        
        return make_response(success=True, message="Liability created successfully", data=liab)
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/liabilities/{liab_id}", response_model=StandardResponse)
def update_liability(
    liab_id: str,
    body: LiabilityUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    try:
        liab = session.get(Liability, liab_id)
        if not liab or liab.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Liability not found")
            
        if body.name is not None:
            liab.name = body.name
        if body.amount is not None:
            liab.amount = body.amount
        if body.category is not None:
            liab.category = body.category
        if body.description is not None:
            liab.description = body.description
            
        liab.updated_at = datetime.utcnow()
        session.add(liab)
        session.commit()
        session.refresh(liab)
        
        sync_liability_memory(liab)
        
        return make_response(success=True, message="Liability updated successfully", data=liab)
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/liabilities/{liab_id}", response_model=StandardResponse)
def delete_liability(
    liab_id: str, 
    current_user: User = Depends(get_current_user), 
    session: Session = Depends(get_session)
):
    try:
        liab = session.get(Liability, liab_id)
        if not liab or liab.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Liability not found")
            
        session.delete(liab)
        session.commit()
        
        delete_liability_memory(liab_id, current_user.id)
        
        return make_response(success=True, message="Liability deleted successfully")
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))
