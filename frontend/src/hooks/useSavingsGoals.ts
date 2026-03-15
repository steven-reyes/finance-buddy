import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import type { SavingsGoal, SavingsGoalContribution } from '../types';

export function useSavingsGoals() {
  return useQuery<SavingsGoal[]>({
    queryKey: ['savings-goals'],
    queryFn: async () => {
      const { data } = await api.get('/savings-goals');
      return data;
    },
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      name: string;
      target_amount: number;
      icon?: string;
      color?: string;
      deadline?: string;
    }) => {
      const { data } = await api.post('/savings-goals', body);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['savings-goals'] });
    },
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: {
      id: number;
      name?: string;
      target_amount?: number;
      icon?: string;
      color?: string;
      deadline?: string | null;
    }) => {
      const { data } = await api.put(`/savings-goals/${id}`, body);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['savings-goals'] });
    },
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/savings-goals/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['savings-goals'] });
    },
  });
}

export function useContributions(goalId: number | undefined) {
  return useQuery<SavingsGoalContribution[]>({
    queryKey: ['savings-goals', goalId, 'contributions'],
    queryFn: async () => {
      const { data } = await api.get(`/savings-goals/${goalId}/contributions`);
      return data;
    },
    enabled: !!goalId,
  });
}

export function useAddContribution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ goalId, ...body }: {
      goalId: number;
      amount: number;
      date: string;
      note?: string;
    }) => {
      const { data } = await api.post(`/savings-goals/${goalId}/contributions`, body);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['savings-goals'] });
    },
  });
}
