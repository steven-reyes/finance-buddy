from pydantic import BaseModel, Field
from typing import Optional, Literal, List


class TransactionCreate(BaseModel):
    type: Literal['income', 'expense']
    amount: int = Field(gt=0)
    date: str = Field(pattern=r'^\d{4}-\d{2}-\d{2}$')
    description: str = Field(min_length=1, max_length=500)
    notes: Optional[str] = Field(None, max_length=2000)
    category_id: Optional[int] = None
    tag_ids: Optional[List[int]] = None


class TransactionUpdate(BaseModel):
    type: Optional[Literal['income', 'expense']] = None
    amount: Optional[int] = Field(None, gt=0)
    date: Optional[str] = Field(None, pattern=r'^\d{4}-\d{2}-\d{2}$')
    description: Optional[str] = Field(None, min_length=1, max_length=500)
    notes: Optional[str] = None
    category_id: Optional[int] = None
    tag_ids: Optional[List[int]] = None


class Transaction(BaseModel):
    id: int
    type: str
    amount: int
    date: str
    description: str
    notes: Optional[str]
    category_id: Optional[int]
    category_name: Optional[str] = None
    category_color: Optional[str] = None
    category_icon: Optional[str] = None
    tags: Optional[List[dict]] = None
    recurring_template_id: Optional[int]
    csv_import_id: Optional[int]
    ocr_upload_id: Optional[int]
    created_at: str
    updated_at: str


class TransactionFilters(BaseModel):
    type: Optional[Literal['income', 'expense']] = None
    category_id: Optional[int] = None
    tag_id: Optional[int] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    search: Optional[str] = None
    sort_by: Optional[str] = None
    sort_order: Optional[Literal['asc', 'desc']] = None
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=100)


class PaginatedTransactions(BaseModel):
    data: List[Transaction]
    total: int
    page: int
    limit: int
    total_pages: int
