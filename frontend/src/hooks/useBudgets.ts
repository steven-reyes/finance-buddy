import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import type { BudgetWithSpending } from '../types';

export function useBudgets(month: string) {
  return useQuery<BudgetWithSpending[]>({
    queryKey: ['budgets', month],
    queryFn: async () => {
      const { data } = await api.get('/budgets', { params: { month } });
      return data;
    },
  });
}

export function useCreateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      category_id: number;
      month: string;
      amount: number;
      warn_threshold?: number;
    }) => {
      const { data } = await api.post('/budgets', body);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: {
      id: number;
      amount?: number;
      warn_threshold?: number;
    }) => {
      const { data } = await api.put(`/budgets/${id}`, body);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/budgets/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDetectIncome() {
  return useQuery({
    queryKey: ['dashboard', 'detect-income'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/detect-income');
      return data as { detected_income: number; source: string; from_recurring: number; from_transactions: number };
    },
  });
}

export function useBulkCreateBudgets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { month: string; budgets: { category_id: number; limit_amount: number; warn_threshold?: number }[] }) => {
      const { data } = await api.post('/budgets/bulk', body);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useCopyForward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ target_month }: { target_month: string }) => {
      const { data } = await api.post('/budgets/copy-forward', { target_month });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}
