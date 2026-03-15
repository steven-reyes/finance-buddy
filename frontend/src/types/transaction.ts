export interface Transaction {
  id: number;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: string;
  category_id: number | null;
  notes: string | null;
  is_recurring: number;
  recurring_template_id: number | null;
  created_at: string;
}

export interface TransactionWithCategory extends Transaction {
  category_name: string | null;
  category_color: string | null;
  category_icon: string | null;
  tags: string[];
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface TransactionFilters {
  type?: 'income' | 'expense';
  category_id?: number;
  start_date?: string;
  end_date?: string;
  search?: string;
  page?: number;
  per_page?: number;
}
