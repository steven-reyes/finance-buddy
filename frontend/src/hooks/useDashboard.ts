import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import type { DashboardSummary, SpendingByCategory, MonthlyTrend, BudgetHealth } from '../types';

export function useDashboardSummary(month: string) {
  return useQuery<DashboardSummary>({
    queryKey: ['dashboard', 'summary', month],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/summary', { params: { month } });
      return data;
    },
  });
}

export function useSpendingByCategory(month: string) {
  return useQuery<SpendingByCategory[]>({
    queryKey: ['dashboard', 'spending-by-category', month],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/spending-by-category', { params: { month } });
      return data;
    },
  });
}

export function useMonthlyTrends(months: number = 6) {
  return useQuery<MonthlyTrend[]>({
    queryKey: ['dashboard', 'monthly-trends', months],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/monthly-trends', { params: { months } });
      return data;
    },
  });
}

export function useBudgetHealth(month: string) {
  return useQuery<BudgetHealth[]>({
    queryKey: ['dashboard', 'budget-health', month],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/budget-health', { params: { month } });
      return data;
    },
  });
}

export function useMonthlyInsights(month: string) {
  return useQuery({
    queryKey: ['dashboard', 'insights', month],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/insights', { params: { month } });
      return data as {
        month: string;
        insights: Array<{ type: 'positive' | 'warning' | 'negative' | 'info'; message: string }>;
      };
    },
  });
}
