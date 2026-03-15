from pydantic import BaseModel, Field
from typing import Optional, List, Literal


class InvestmentCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    type: Literal['401k', 'ira', 'brokerage', 'hsa', 'crypto', 'other']
    institution: Optional[str] = Field(None, max_length=200)
    contributions: int = Field(default=0, ge=0)
    current_value: int = Field(default=0, ge=0)
    notes: Optional[str] = Field(None, max_length=2000)


class InvestmentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    type: Optional[Literal['401k', 'ira', 'brokerage', 'hsa', 'crypto', 'other']] = None
    institution: Optional[str] = Field(None, max_length=200)
    notes: Optional[str] = None


class UpdateValueRequest(BaseModel):
    current_value: int = Field(ge=0)
    contributions: Optional[int] = Field(None, ge=0)


class Investment(BaseModel):
    id: int
    name: str
    type: str
    institution: Optional[str]
    contributions: int
    current_value: int
    notes: Optional[str]
    last_updated: str


class InvestmentSnapshot(BaseModel):
    id: int
    investment_id: int
    value: int
    contributions: int
    recorded_at: str


class InvestmentSummary(BaseModel):
    total_value: int = 0
    total_contributions: int = 0
    total_gain: int = 0
    gain_percentage: float = 0.0
    by_type: List[dict] = []
