export interface Debt {
  id: number;
  name: string;
  type: 'advance' | 'personal' | 'credit_card' | 'loan' | 'bill_arrears' | 'medical' | 'other';
  creditor: string;
  original_amount: number;
  current_balance: number;
  minimum_payment: number;
  interest_rate: number;
  due_day: number | null;
  priority: number;
  is_auto_deduct: number;
  notes: string | null;
  status: 'active' | 'paid_off' | 'paused';
  total_paid: number;
  created_at: string;
}

export interface DebtPayment {
  id: number;
  debt_id: number;
  amount: number;
  date: string;
  note: string | null;
}

export interface DebtSummary {
  total_debts: number;
  total_owed: number;
  total_minimum_monthly: number;
  monthly_interest_cost: number;
  debts_by_priority: Debt[];
}

export interface PayoffPlan {
  strategy: string;
  debts: Array<{
    id: number;
    name: string;
    current_balance: number;
    interest_rate: number;
    estimated_payoff_date: string;
    months_to_payoff: number;
    total_interest: number;
    total_interest_paid: number;
  }>;
  total_months: number;
  total_interest: number;
  debt_free_date: string;
}

export interface PaycheckAllocation {
  paycheck_amount: number;
  allocations: Array<{
    name: string;
    amount: number;
    type: 'auto_deduct' | 'housing' | 'utility' | 'minimum_payment' | 'essentials' | 'extra_payment' | 'buffer';
    priority: number;
    running_remaining: number;
    debt_id?: number;
  }>;
  total_allocated: number;
  remaining: number;
  shortfall: number;
  essentials_covered: boolean;
  warnings: string[];
}
