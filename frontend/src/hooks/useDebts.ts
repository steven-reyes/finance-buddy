import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import type { Debt, DebtPayment, DebtSummary, PayoffPlan, PaycheckAllocation } from '../types/debt';

export function useDebts(status?: string) {
  return useQuery<Debt[]>({
    queryKey: ['debts', status],
    queryFn: async () => {
      const { data } = await api.get('/debts', { params: status ? { status } : undefined });
      return data;
    },
  });
}

export function useDebt(id: number | null) {
  return useQuery<Debt>({
    queryKey: ['debts', id],
    queryFn: async () => {
      const { data } = await api.get(`/debts/${id}`);
      return data;
    },
    enabled: id !== null,
  });
}

export function useDebtSummary() {
  return useQuery<DebtSummary>({
    queryKey: ['debts', 'summary'],
    queryFn: async () => {
      const { data } = await api.get('/debts/summary');
      return data;
    },
  });
}

export function usePayoffPlan(strategy: string) {
  return useQuery<PayoffPlan>({
    queryKey: ['debts', 'payoff-plan', strategy],
    queryFn: async () => {
      const { data } = await api.get('/debts/payoff-plan', { params: { strategy } });
      return data;
    },
  });
}

export function useCreateDebt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Omit<Debt, 'id' | 'total_paid' | 'created_at'>) => {
      const { data } = await api.post('/debts', body);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['debts'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateDebt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<Debt> & { id: number }) => {
      const { data } = await api.put(`/debts/${id}`, body);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['debts'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteDebt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/debts/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['debts'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useAddDebtPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ debtId, ...body }: { debtId: number; amount: number; date: string; note?: string }) => {
      const { data } = await api.post(`/debts/${debtId}/payments`, body);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['debts'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDebtPayments(id: number | null) {
  return useQuery<DebtPayment[]>({
    queryKey: ['debts', id, 'payments'],
    queryFn: async () => {
      const { data } = await api.get(`/debts/${id}/payments`);
      return data;
    },
    enabled: id !== null,
  });
}

export function useAllocatePaycheck() {
  return useMutation<PaycheckAllocation, Error, { paycheck_amount: number }>({
    mutationFn: async (body) => {
      const { data } = await api.post('/debts/allocate', body);
      return data;
    },
  });
}
