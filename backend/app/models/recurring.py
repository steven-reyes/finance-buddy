from pydantic import BaseModel, Field
from typing import Optional, Literal, List


class RecurringCreate(BaseModel):
    type: Literal['income', 'expense']
    amount: int = Field(gt=0)
    description: str = Field(min_length=1, max_length=500)
    category_id: Optional[int] = None
    frequency: Literal['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']
    start_date: str = Field(pattern=r'^\d{4}-\d{2}-\d{2}$')
    end_date: Optional[str] = Field(None, pattern=r'^\d{4}-\d{2}-\d{2}$')


class RecurringUpdate(BaseModel):
    type: Optional[Literal['income', 'expense']] = None
    amount: Optional[int] = Field(None, gt=0)
    description: Optional[str] = Field(None, min_length=1, max_length=500)
    category_id: Optional[int] = None
    frequency: Optional[Literal['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']] = None
    end_date: Optional[str] = None
    is_active: Optional[int] = None


class BulkRecurringCreate(BaseModel):
    templates: List[RecurringCreate]


class RecurringTemplate(BaseModel):
    id: int
    type: str
    amount: int
    description: str
    category_id: Optional[int]
    category_name: Optional[str] = None
    frequency: str
    start_date: str
    end_date: Optional[str]
    last_generated: Optional[str]
    is_active: int
