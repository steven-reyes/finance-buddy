from pydantic import BaseModel, Field
from typing import Optional, Literal, List


class DebtCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    type: Literal['advance', 'personal', 'credit_card', 'loan', 'bill_arrears', 'medical', 'other']
    creditor: str = Field(min_length=1, max_length=200)
    original_amount: int = Field(gt=0)
    current_balance: int = Field(ge=0)
    minimum_payment: int = Field(default=0, ge=0)
    interest_rate: float = Field(default=0, ge=0, le=100)
    due_day: Optional[int] = Field(None, ge=1, le=31)
    priority: int = Field(default=5, ge=1, le=10)
    is_auto_deduct: bool = False
    notes: Optional[str] = None


class DebtUpdate(BaseModel):
    name: Optional[str] = None
    creditor: Optional[str] = None
    current_balance: Optional[int] = Field(None, ge=0)
    minimum_payment: Optional[int] = Field(None, ge=0)
    interest_rate: Optional[float] = Field(None, ge=0, le=100)
    due_day: Optional[int] = Field(None, ge=1, le=31)
    priority: Optional[int] = Field(None, ge=1, le=10)
    is_auto_deduct: Optional[bool] = None
    notes: Optional[str] = None
    status: Optional[Literal['active', 'paid_off', 'paused']] = None


class DebtPaymentCreate(BaseModel):
    amount: int = Field(gt=0)
    date: str = Field(pattern=r'^\d{4}-\d{2}-\d{2}$')
    note: Optional[str] = None


class PaycheckAllocation(BaseModel):
    paycheck_amount: int = Field(gt=0)
    pay_date: str = Field(pattern=r'^\d{4}-\d{2}-\d{2}$')
