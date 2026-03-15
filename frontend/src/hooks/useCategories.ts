import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import type { Category } from '../types';

export function useCategories(type?: 'income' | 'expense') {
  return useQuery<Category[]>({
    queryKey: ['categories', type],
    queryFn: async () => {
      const params = type ? { type } : {};
      const { data } = await api.get('/categories', { params });
      return data;
    },
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; type: 'income' | 'expense'; color?: string; icon?: string }) => {
      const { data } = await api.post('/categories', body);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: number; name?: string; color?: string; icon?: string }) => {
      const { data } = await api.put(`/categories/${id}`, body);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/categories/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}
