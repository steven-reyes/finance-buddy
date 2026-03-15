export interface SavingsGoal {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  icon: string | null;
  color: string | null;
  deadline: string | null;
  created_at: string;
}

export interface SavingsGoalContribution {
  id: number;
  goal_id: number;
  amount: number;
  date: string;
  note: string | null;
  created_at: string;
}
