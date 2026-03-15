export interface RecurringTemplate {
  id: number;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category_id: number | null;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  start_date: string;
  end_date: string | null;
  next_due: string;
  is_active: number;
  created_at: string;
}
