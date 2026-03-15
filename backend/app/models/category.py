from pydantic import BaseModel, Field
from typing import Optional, Literal


class CategoryBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    type: Literal['income', 'expense']
    color: Optional[str] = Field(None, pattern=r'^#[0-9a-fA-F]{6}$')
    icon: Optional[str] = Field(None, max_length=10)


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    color: Optional[str] = Field(None, pattern=r'^#[0-9a-fA-F]{6}$')
    icon: Optional[str] = Field(None, max_length=10)


class Category(CategoryBase):
    id: int
    is_default: int

    class Config:
        from_attributes = True
