export interface Investment {
  id: number;
  name: string;
  type: string;
  institution: string | null;
  current_value: number;
  total_contributions: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvestmentSnapshot {
  id: number;
  investment_id: number;
  value: number;
  date: string;
  created_at: string;
}

export interface InvestmentSummary {
  total_value: number;
  total_contributions: number;
  total_return: number;
  return_percentage: number;
  count: number;
}
