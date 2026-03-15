export interface DashboardSummary {
  income: number;
  expenses: number;
  net: number;
  investment_value: number;
  prev_income: number;
  prev_expenses: number;
  prev_net: number;
  prev_investment_value: number;
}

export interface SpendingByCategory {
  category_id: number;
  category_name: string;
  category_color: string | null;
  amount: number;
  percentage: number;
}

export interface MonthlyTrend {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

export interface BudgetHealth {
  id: number;
  category_name: string;
  category_color: string | null;
  amount: number;
  spent: number;
  percentage: number;
  warn_threshold: number;
}
