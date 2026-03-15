export interface Budget {
  id: number;
  category_id: number;
  month: string;
  amount: number;
  warn_threshold: number;
  created_at: string;
}

export interface BudgetWithSpending extends Budget {
  spent: number;
  category_name: string;
  category_color: string | null;
  category_icon: string | null;
  percentage: number;
}
