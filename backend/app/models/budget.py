from pydantic import BaseModel, Field
from typing import Optional, List


class BudgetCreate(BaseModel):
    category_id: int
    month: str = Field(pattern=r'^\d{4}-\d{2}$')
    limit_amount: int = Field(gt=0)
    warn_threshold: int = Field(default=80, ge=1, le=100)


class BudgetUpdate(BaseModel):
    limit_amount: Optional[int] = Field(None, gt=0)
    warn_threshold: Optional[int] = Field(None, ge=1, le=100)


class Budget(BaseModel):
    id: int
    category_id: int
    month: str
    limit_amount: int
    warn_threshold: int


class BudgetWithSpending(Budget):
    category_name: Optional[str] = None
    category_color: Optional[str] = None
    category_icon: Optional[str] = None
    spent: int = 0
    remaining: int = 0
    percentage: float = 0.0
    status: str = "ok"


class CopyForwardRequest(BaseModel):
    target_month: str = Field(pattern=r'^\d{4}-\d{2}$')
