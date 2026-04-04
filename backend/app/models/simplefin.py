from pydantic import BaseModel, Field
from typing import Optional, List


class SetupTokenRequest(BaseModel):
    setup_token: str = Field(min_length=1)


class ImportTransactionRequest(BaseModel):
    transaction_id: int
    category_id: Optional[int] = None
    description: Optional[str] = None


class ImportAllRequest(BaseModel):
    account_id: Optional[int] = None
    default_category_id: Optional[int] = None


class ConnectionStatus(BaseModel):
    id: int
    institution_name: Optional[str] = None
    status: str
    last_synced: Optional[str] = None
    error_message: Optional[str] = None
    account_count: int = 0
    created_at: str
    updated_at: str


class LinkedAccountResponse(BaseModel):
    id: int
    connection_id: int
    simplefin_account_id: str
    name: str
    institution: Optional[str] = None
    balance_cents: Optional[int] = None
    available_balance_cents: Optional[int] = None
    currency: str = "USD"
    account_type: Optional[str] = None
    last_synced: Optional[str] = None


class SyncedTransactionResponse(BaseModel):
    id: int
    account_id: int
    simplefin_transaction_id: str
    amount_cents: int
    description: str
    posted_date: Optional[str] = None
    transacted_date: Optional[str] = None
    pending: bool = False
    category: Optional[str] = None
    imported: bool = False
    imported_transaction_id: Optional[int] = None
    created_at: str
    account_name: Optional[str] = None
    account_institution: Optional[str] = None


class SyncResult(BaseModel):
    new_accounts: int = 0
    updated_accounts: int = 0
    new_transactions: int = 0
    updated_transactions: int = 0


class PaginatedSyncedTransactions(BaseModel):
    transactions: List[SyncedTransactionResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
