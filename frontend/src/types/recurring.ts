export interface RecurringTemplate {
  id: number;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category_id: number | null;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
  start_date: string;
  end_date: string | null;
  next_due: string;
  is_active: number;
  created_at: string;
}
