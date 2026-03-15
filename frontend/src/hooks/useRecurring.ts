import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import type { RecurringTemplate } from '../types';

export function useRecurring() {
  return useQuery<RecurringTemplate[]>({
    queryKey: ['recurring'],
    queryFn: async () => {
      const { data } = await api.get('/recurring');
      return data;
    },
  });
}

export function useCreateRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      type: 'income' | 'expense';
      amount: number;
      description: string;
      category_id?: number;
      frequency: string;
      start_date: string;
      end_date?: string;
    }) => {
      const { data } = await api.post('/recurring', body);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recurring'] });
    },
  });
}

export function useUpdateRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: {
      id: number;
      amount?: number;
      description?: string;
      category_id?: number;
      frequency?: string;
      end_date?: string | null;
      is_active?: number;
    }) => {
      const { data } = await api.put(`/recurring/${id}`, body);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recurring'] });
    },
  });
}

export function useDeleteRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/recurring/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recurring'] });
    },
  });
}

export function useBulkCreateRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (templates: Array<{
      type: string; amount: number; description: string;
      category_id: number; frequency: string; start_date: string;
    }>) => {
      const { data } = await api.post('/recurring/bulk', { templates });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recurring'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useGenerateRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/recurring/generate');
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recurring'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
