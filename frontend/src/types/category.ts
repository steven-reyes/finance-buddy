export interface Category {
  id: number;
  name: string;
  type: 'income' | 'expense';
  color: string | null;
  icon: string | null;
  is_default: number;
}
