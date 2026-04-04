export interface SimpleFinConnection {
  id: number;
  institution_name: string | null;
  status: 'active' | 'error' | 'disconnected';
  last_synced: string | null;
  error_message: string | null;
  account_count: number;
  created_at: string;
  updated_at: string;
}

export interface LinkedAccount {
  id: number;
  connection_id: number;
  simplefin_account_id: string;
  name: string;
  institution: string | null;
  balance_cents: number | null;
  available_balance_cents: number | null;
  currency: string;
  account_type: string | null;
  last_synced: string | null;
}

export interface SyncedTransaction {
  id: number;
  account_id: number;
  simplefin_transaction_id: string;
  amount_cents: number;
  description: string;
  posted_date: string | null;
  transacted_date: string | null;
  pending: boolean;
  category: string | null;
  imported: boolean;
  imported_transaction_id: number | null;
  created_at: string;
  account_name: string | null;
  account_institution: string | null;
}

export interface SyncResult {
  new_accounts: number;
  updated_accounts: number;
  new_transactions: number;
  updated_transactions: number;
}

export interface PaginatedSyncedTransactions {
  transactions: SyncedTransaction[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}
