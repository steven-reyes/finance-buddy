import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import type { Investment, InvestmentSnapshot, InvestmentSummary } from '../types';

export function useInvestments() {
  return useQuery<Investment[]>({
    queryKey: ['investments'],
    queryFn: async () => {
      const { data } = await api.get('/investments');
      return data;
    },
  });
}

export function useInvestment(id: number | undefined) {
  return useQuery<Investment>({
    queryKey: ['investments', id],
    queryFn: async () => {
      const { data } = await api.get(`/investments/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useInvestmentSnapshots(id: number | undefined) {
  return useQuery<InvestmentSnapshot[]>({
    queryKey: ['investments', id, 'snapshots'],
    queryFn: async () => {
      const { data } = await api.get(`/investments/${id}/snapshots`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateInvestment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      name: string;
      type: string;
      institution?: string;
      current_value: number;
      total_contributions: number;
      notes?: string;
    }) => {
      const { data } = await api.post('/investments', body);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['investments'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateInvestment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: {
      id: number;
      name?: string;
      type?: string;
      institution?: string;
      notes?: string;
    }) => {
      const { data } = await api.put(`/investments/${id}`, body);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['investments'] });
    },
  });
}

export function useUpdateInvestmentValue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, value, date }: { id: number; value: number; date?: string }) => {
      const { data } = await api.post(`/investments/${id}/value`, { value, date });
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['investments'] });
      qc.invalidateQueries({ queryKey: ['investments', variables.id, 'snapshots'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteInvestment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/investments/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['investments'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useInvestmentSummary() {
  return useQuery<InvestmentSummary>({
    queryKey: ['investments', 'summary'],
    queryFn: async () => {
      const { data } = await api.get('/investments/summary');
      return data;
    },
  });
}
