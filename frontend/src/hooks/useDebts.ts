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

export function useMatchCreditor(description: string) {
  return useQuery({
    queryKey: ['debts', 'match-creditor', description],
    queryFn: async () => {
      const { data } = await api.get('/debts/match-creditor', { params: { description } });
      return data.match as { id: number; name: string; creditor: string; current_balance: number; type: string } | null;
    },
    enabled: description.length >= 3,
    staleTime: 60000,
  });
}

export function useSimulatePayoff(extraMonthly: number, strategy: string) {
  return useQuery<PayoffPlan>({
    queryKey: ['debts', 'simulate', extraMonthly, strategy],
    queryFn: async () => {
      const { data } = await api.get('/debts/simulate', { params: { extra_monthly: extraMonthly, strategy } });
      return data;
    },
    enabled: true,
  });
}

export function useUpcomingDebtDue(days: number = 7) {
  return useQuery({
    queryKey: ['debts', 'upcoming-due', days],
    queryFn: async () => {
      const { data } = await api.get('/debts/upcoming-due', { params: { days } });
      return data as Array<{
        id: number;
        name: string;
        creditor: string;
        current_balance: number;
        due_day: number;
        priority: number;
        type: string;
        days_until: number;
        due_date: string;
      }>;
    },
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
