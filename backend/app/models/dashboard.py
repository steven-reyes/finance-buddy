from pydantic import BaseModel
from typing import List, Optional


class DashboardSummary(BaseModel):
    month: str
    total_income: int = 0
    total_expenses: int = 0
    net: int = 0
    transaction_count: int = 0


class SpendingByCategory(BaseModel):
    category_id: int
    category_name: str
    category_color: Optional[str] = None
    category_icon: Optional[str] = None
    amount: int = 0
    percentage: float = 0.0


class MonthlyTrend(BaseModel):
    month: str
    income: int = 0
    expenses: int = 0
    net: int = 0


class BudgetHealth(BaseModel):
    category_id: int
    category_name: str
    category_color: Optional[str] = None
    limit_amount: int
    spent: int
    remaining: int
    percentage: float
    status: str
