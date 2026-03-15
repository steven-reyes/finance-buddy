import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import type { TransactionWithCategory, PaginatedResult, TransactionFilters } from '../types';

export function useTransactions(filters: TransactionFilters = {}) {
  return useQuery<PaginatedResult<TransactionWithCategory>>({
    queryKey: ['transactions', filters],
    queryFn: async () => {
      const params: Record<string, string | number> = {};
      if (filters.type) params.type = filters.type;
      if (filters.category_id) params.category_id = filters.category_id;
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;
      if (filters.search) params.search = filters.search;
      if (filters.page) params.page = filters.page;
      if (filters.per_page) params.per_page = filters.per_page;
      const { data } = await api.get('/transactions', { params });
      return data;
    },
  });
}

export function useTransaction(id: number | undefined) {
  return useQuery({
    queryKey: ['transactions', id],
    queryFn: async () => {
      const { data } = await api.get(`/transactions/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      type: 'income' | 'expense';
      amount: number;
      description: string;
      date: string;
      category_id?: number | null;
      notes?: string;
      tag_ids?: number[];
    }) => {
      const { data } = await api.post('/transactions', body);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: {
      id: number;
      type?: 'income' | 'expense';
      amount?: number;
      description?: string;
      date?: string;
      category_id?: number | null;
      notes?: string;
      tag_ids?: number[];
    }) => {
      const { data } = await api.put(`/transactions/${id}`, body);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/transactions/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
