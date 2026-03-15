from pydantic import BaseModel, Field
from typing import Optional, List


class SavingsGoalCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    target_amount: int = Field(gt=0)
    deadline: Optional[str] = Field(None, pattern=r'^\d{4}-\d{2}-\d{2}$')
    icon: Optional[str] = Field(None, max_length=10)


class SavingsGoalUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    target_amount: Optional[int] = Field(None, gt=0)
    deadline: Optional[str] = None
    icon: Optional[str] = None
    is_completed: Optional[int] = None


class SavingsGoal(BaseModel):
    id: int
    name: str
    target_amount: int
    current_amount: int
    deadline: Optional[str]
    icon: Optional[str]
    is_completed: int
    percentage: float = 0.0


class ContributionCreate(BaseModel):
    amount: int
    date: str = Field(pattern=r'^\d{4}-\d{2}-\d{2}$')
    note: Optional[str] = Field(None, max_length=500)
    transaction_id: Optional[int] = None


class Contribution(BaseModel):
    id: int
    goal_id: int
    amount: int
    date: str
    note: Optional[str]
    transaction_id: Optional[int]
