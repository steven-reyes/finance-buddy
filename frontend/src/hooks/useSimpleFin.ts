import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import type { SimpleFinConnection, LinkedAccount, SyncResult, PaginatedSyncedTransactions } from '../types/simplefin';

export function useSimpleFinStatus() {
  return useQuery<{ connection: SimpleFinConnection | null; account_count: number }>({
    queryKey: ['simplefin', 'status'],
    queryFn: async () => {
      const { data } = await api.get('/simplefin/status');
      return data;
    },
  });
}

export function useSimpleFinAccounts() {
  return useQuery<LinkedAccount[]>({
    queryKey: ['simplefin', 'accounts'],
    queryFn: async () => {
      const { data } = await api.get('/simplefin/accounts');
      return data;
    },
  });
}

export function useSyncedTransactions(params: {
  account_id?: number;
  imported?: boolean;
  start_date?: string;
  end_date?: string;
  page?: number;
  per_page?: number;
}) {
  return useQuery<PaginatedSyncedTransactions>({
    queryKey: ['simplefin', 'transactions', params],
    queryFn: async () => {
      const { data } = await api.get('/simplefin/transactions', { params });
      return data;
    },
  });
}

export function useSetupSimpleFin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (setup_token: string) => {
      const { data } = await api.post('/simplefin/setup', { setup_token });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['simplefin'] });
    },
  });
}

export function useDisconnectSimpleFin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (connectionId: number) => {
      await api.delete(`/simplefin/connections/${connectionId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['simplefin'] });
    },
  });
}

export function useSyncSimpleFin() {
  const qc = useQueryClient();
  return useMutation<SyncResult>({
    mutationFn: async () => {
      const { data } = await api.post('/simplefin/sync');
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['simplefin', 'accounts'] });
      qc.invalidateQueries({ queryKey: ['simplefin', 'transactions'] });
      qc.invalidateQueries({ queryKey: ['simplefin', 'status'] });
    },
  });
}

export function useImportTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { transaction_id: number; category_id?: number; description?: string }) => {
      const { data } = await api.post('/simplefin/import', body);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['simplefin', 'transactions'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useImportAllTransactions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { account_id?: number; default_category_id?: number }) => {
      const { data } = await api.post('/simplefin/import-all', body);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['simplefin', 'transactions'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
