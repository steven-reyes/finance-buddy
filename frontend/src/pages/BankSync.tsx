import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Loader2, Building2, RefreshCw, Unlink, CheckCircle2, AlertTriangle,
  ExternalLink, CreditCard, ArrowDownToLine, ChevronLeft, ChevronRight,
  Check, Import,
} from 'lucide-react';
import { formatCents, formatDate } from '../lib/format';
import {
  useSimpleFinStatus,
  useSimpleFinAccounts,
  useSyncedTransactions,
  useSetupSimpleFin,
  useDisconnectSimpleFin,
  useSyncSimpleFin,
  useImportTransaction,
  useImportAllTransactions,
} from '../hooks/useSimpleFin';
import type { SyncedTransaction } from '../types/simplefin';
type ImportFilter = 'all' | 'not_imported' | 'imported';
const FILTER_TABS: { key: ImportFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'not_imported', label: 'Not Imported' },
  { key: 'imported', label: 'Imported' },
];
function filterToParam(f: ImportFilter): boolean | undefined {
  if (f === 'imported') return true;
  if (f === 'not_imported') return false;
  return undefined;
}
function StatusBadge({ status }: { status: 'active' | 'error' | 'disconnected' }) {
  const config = {
    active: { dot: 'bg-green-400', text: 'text-green-400', label: 'Connected' },
    error: { dot: 'bg-red-400', text: 'text-red-400', label: 'Error' },
    disconnected: { dot: 'bg-gray-500', text: 'text-gray-400', label: 'Disconnected' },
  }[status];

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${config.text}`}>
      <span className={`w-2 h-2 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
function AccountCard({ account }: { account: { id: number; name: string; institution: string | null; balance_cents: number | null; available_balance_cents: number | null; account_type: string | null } }) {
  return (
    <div className="glass-card rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#C9A84C]/10 flex items-center justify-center">
            <CreditCard size={18} className="text-[#C9A84C]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[#FAF8F5]">{account.name}</p>
            {account.institution && (
              <p className="text-xs text-[#6b6b80]">{account.institution}</p>
            )}
          </div>
        </div>
        {account.account_type && (
          <span className="text-[10px] uppercase tracking-wider text-[#6b6b80] bg-white/[0.06] px-2 py-0.5 rounded-full border border-white/[0.06]">
            {account.account_type}
          </span>
        )}
      </div>
      <div className="space-y-1">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-[#a1a1b5]">Balance</span>
          <span className="text-sm font-semibold text-[#FAF8F5]">
            {account.balance_cents != null ? formatCents(account.balance_cents) : '—'}
          </span>
        </div>
        {account.available_balance_cents != null && (
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-[#6b6b80]">Available</span>
            <span className="text-xs text-[#a1a1b5]">
              {formatCents(account.available_balance_cents)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function TransactionRow({
  tx,
  isSelected,
  onToggle,
  onImport,
  isImporting,
}: {
  tx: SyncedTransaction;
  isSelected: boolean;
  onToggle: () => void;
  onImport: () => void;
  isImporting: boolean;
}) {
  const isPositive = tx.amount_cents > 0;
  const dateStr = tx.posted_date ?? tx.transacted_date;

  return (
    <tr className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
      <td className="py-3 px-3 w-10">
        {!tx.imported && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggle}
            className="rounded bg-[#1e1e2a] border-white/[0.12] text-[#C9A84C] focus:ring-[#C9A84C]/30"
          />
        )}
      </td>
      <td className="py-3 px-3 text-xs text-[#a1a1b5] whitespace-nowrap">
        {dateStr ? formatDate(dateStr) : '—'}
      </td>
      <td className="py-3 px-3 text-sm text-[#FAF8F5] max-w-[200px] truncate">
        {tx.description}
      </td>
      <td className={`py-3 px-3 text-sm font-medium text-right whitespace-nowrap ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {isPositive ? '+' : ''}{formatCents(tx.amount_cents)}
      </td>
      <td className="py-3 px-3 text-xs text-[#6b6b80] whitespace-nowrap">
        {tx.account_name ?? '—'}
      </td>
      <td className="py-3 px-3 text-right">
        {tx.imported ? (
          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-medium text-green-400 bg-green-400/10 border border-green-400/20 px-2 py-0.5 rounded-full">
            <Check size={10} />
            Imported
          </span>
        ) : (
          <button
            onClick={onImport}
            disabled={isImporting}
            className="text-xs text-[#C9A84C] hover:text-[#b8952f] font-medium transition-colors disabled:opacity-50"
          >
            {isImporting ? <Loader2 size={12} className="animate-spin" /> : 'Import'}
          </button>
        )}
      </td>
    </tr>
  );
}

function SetupView() {
  const [token, setToken] = useState('');
  const setup = useSetupSimpleFin();

  const handleSetup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;
    setup.mutate(token.trim());
  };

  return (
    <div className="max-w-lg mx-auto mt-12">
      <div className="glass-card rounded-2xl p-8">
        <div className="w-12 h-12 rounded-xl bg-[#C9A84C]/10 flex items-center justify-center mb-5">
          <Building2 size={24} className="text-[#C9A84C]" />
        </div>

        <h2 className="text-xl font-bold text-[#FAF8F5] mb-2">Connect Your Bank</h2>
        <p className="text-sm text-[#a1a1b5] mb-6 leading-relaxed">
          SimpleFIN Bridge securely connects your bank accounts for $1.50/month
          (paid directly to SimpleFIN). Your bank credentials are never shared
          with this app.
        </p>

        <ol className="space-y-3 mb-6">
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#C9A84C]/10 text-[#C9A84C] text-xs font-bold flex items-center justify-center mt-0.5">1</span>
            <span className="text-sm text-[#a1a1b5]">
              Sign up at{' '}
              <a
                href="https://bridge.simplefin.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#C9A84C] hover:text-[#b8952f] inline-flex items-center gap-1 transition-colors"
              >
                SimpleFIN Bridge <ExternalLink size={12} />
              </a>
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#C9A84C]/10 text-[#C9A84C] text-xs font-bold flex items-center justify-center mt-0.5">2</span>
            <span className="text-sm text-[#a1a1b5]">Add your bank and copy the setup token</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#C9A84C]/10 text-[#C9A84C] text-xs font-bold flex items-center justify-center mt-0.5">3</span>
            <span className="text-sm text-[#a1a1b5]">Paste the token below</span>
          </li>
        </ol>

        <form onSubmit={handleSetup} className="space-y-4">
          <input
            type="text"
            value={token}
            onChange={e => setToken(e.target.value)}
            placeholder="Paste your SimpleFIN setup token..."
            className="w-full bg-[#1e1e2a] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-[#FAF8F5] placeholder-[#6b6b80] focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/30 focus:border-[#C9A84C]/50 transition-all"
          />

          {setup.isError && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              <AlertTriangle size={14} />
              {(setup.error as any)?.response?.data?.detail ?? (setup.error as Error)?.message ?? 'Failed to connect. Check your token and try again.'}
            </div>
          )}

          <button
            type="submit"
            disabled={setup.isPending || !token.trim()}
            className="w-full bg-[#C9A84C] hover:bg-[#b8952f] text-[#0D0D12] font-semibold rounded-lg px-4 py-2.5 text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {setup.isPending && <Loader2 size={14} className="animate-spin" />}
            Connect
          </button>
        </form>
      </div>
    </div>
  );
}

function ConnectedView() {
  const { data: statusData } = useSimpleFinStatus();
  const { data: accounts, isLoading: loadingAccounts } = useSimpleFinAccounts();
  const sync = useSyncSimpleFin();
  const disconnect = useDisconnectSimpleFin();
  const importOne = useImportTransaction();
  const importAll = useImportAllTransactions();

  const [importFilter, setImportFilter] = useState<ImportFilter>('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const connection = statusData!.connection!;
  const perPage = 20;

  const { data: txData, isLoading: loadingTx } = useSyncedTransactions({
    imported: filterToParam(importFilter),
    page,
    per_page: perPage,
  });

  const transactions = txData?.transactions ?? [];
  const totalPages = txData?.total_pages ?? 1;
  const totalTx = txData?.total ?? 0;

  const unimportedOnPage = transactions.filter(t => !t.imported);
  const allOnPageSelected = unimportedOnPage.length > 0 && unimportedOnPage.every(t => selected.has(t.id));

  const handleToggleAll = () => {
    if (allOnPageSelected) {
      const next = new Set(selected);
      for (const t of unimportedOnPage) next.delete(t.id);
      setSelected(next);
    } else {
      const next = new Set(selected);
      for (const t of unimportedOnPage) next.add(t.id);
      setSelected(next);
    }
  };

  const handleToggle = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelected(next);
  };

  const handleImportOne = (txId: number) => {
    importOne.mutate({ transaction_id: txId }, { onSuccess: () => {
      setSuccessBanner('Imported 1 transaction');
      setTimeout(() => setSuccessBanner(null), 5000);
    }});
  };

  const handleImportSelected = () => {
    const ids = Array.from(selected);
    let done = 0;
    for (const id of ids) {
      importOne.mutate({ transaction_id: id }, { onSuccess: () => {
        if (++done === ids.length) {
          setSelected(new Set());
          setSuccessBanner(`Imported ${ids.length} transactions`);
          setTimeout(() => setSuccessBanner(null), 5000);
        }
      }});
    }
  };

  const handleImportAll = () => {
    importAll.mutate({}, { onSuccess: (data) => {
      setSelected(new Set());
      const count = (data as { imported_count?: number })?.imported_count ?? 0;
      setSuccessBanner(`Imported ${count} transactions`);
      setTimeout(() => setSuccessBanner(null), 5000);
    }});
  };

  const handleDisconnect = () => {
    disconnect.mutate(connection.id, { onSuccess: () => setShowDisconnectConfirm(false) });
  };

  const handleFilterChange = (f: ImportFilter) => { setImportFilter(f); setPage(1); setSelected(new Set()); };

  const unimportedCount = importFilter === 'not_imported' ? totalTx : unimportedOnPage.length;

  return (
    <div className="space-y-6">
      {successBanner && (
        <div className="flex items-center gap-2 text-sm text-green-400 bg-green-400/10 border border-green-400/20 rounded-lg px-4 py-3">
          <CheckCircle2 size={16} />
          <span>{successBanner}</span>
          <span className="text-[#6b6b80] mx-1">·</span>
          <Link to="/transactions" className="text-[#C9A84C] hover:text-[#b8952f] font-medium transition-colors">
            View transactions
          </Link>
        </div>
      )}

      <div className="glass-card rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#C9A84C]/10 flex items-center justify-center">
              <Building2 size={20} className="text-[#C9A84C]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#FAF8F5]">
                {connection.institution_name ?? 'SimpleFIN Connected'}
              </h2>
              <div className="flex items-center gap-3 mt-0.5">
                <StatusBadge status={connection.status} />
                {connection.last_synced && (
                  <span className="text-xs text-[#6b6b80]">
                    Last synced {formatDate(connection.last_synced.split(' ')[0])}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => sync.mutate()}
              disabled={sync.isPending}
              className="inline-flex items-center gap-2 bg-[#C9A84C] hover:bg-[#b8952f] text-[#0D0D12] font-semibold rounded-lg px-4 py-2 text-sm transition-colors disabled:opacity-50"
            >
              {sync.isPending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Sync Now
            </button>
            <button
              onClick={() => setShowDisconnectConfirm(true)}
              className="inline-flex items-center gap-2 border border-red-400/30 text-red-400 hover:bg-red-400/10 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              <Unlink size={14} />
              Disconnect
            </button>
          </div>
        </div>

        {/* Error from connection */}
        {connection.status === 'error' && connection.error_message && (
          <div className="mt-4 flex items-center gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
            <AlertTriangle size={14} />
            {connection.error_message}
          </div>
        )}
      </div>

      {showDisconnectConfirm && (
        <div className="glass-card rounded-xl p-5 border border-red-400/20">
          <p className="text-sm text-[#FAF8F5] mb-1 font-medium">Disconnect SimpleFIN?</p>
          <p className="text-xs text-[#a1a1b5] mb-4">
            This will remove the connection and all synced data. Previously imported transactions will not be affected.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleDisconnect}
              disabled={disconnect.isPending}
              className="inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg px-4 py-2 text-sm transition-colors disabled:opacity-50"
            >
              {disconnect.isPending && <Loader2 size={14} className="animate-spin" />}
              Yes, Disconnect
            </button>
            <button
              onClick={() => setShowDisconnectConfirm(false)}
              className="px-4 py-2 text-sm text-[#a1a1b5] hover:text-[#FAF8F5] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <section>
        <h3 className="text-sm font-semibold text-[#a1a1b5] uppercase tracking-wider mb-3">
          Linked Accounts
        </h3>
        {loadingAccounts ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 bg-white/[0.06] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : accounts && accounts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map(a => <AccountCard key={a.id} account={a} />)}
          </div>
        ) : (
          <div className="glass-card rounded-xl p-6 text-center">
            <p className="text-sm text-[#6b6b80]">No accounts found. Try syncing.</p>
          </div>
        )}
      </section>

      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <h3 className="text-sm font-semibold text-[#a1a1b5] uppercase tracking-wider">
            Synced Transactions
          </h3>
          <div className="flex items-center gap-2">
            {/* Filter Tabs */}
            <div className="flex bg-white/[0.04] rounded-lg p-0.5 border border-white/[0.06]">
              {FILTER_TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => handleFilterChange(tab.key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    importFilter === tab.key
                      ? 'bg-[#C9A84C] text-[#0D0D12]'
                      : 'text-[#a1a1b5] hover:text-[#FAF8F5]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {unimportedCount > 0 && (
              <button
                onClick={handleImportAll}
                disabled={importAll.isPending}
                className="inline-flex items-center gap-1.5 bg-[#C9A84C] hover:bg-[#b8952f] text-[#0D0D12] font-semibold rounded-lg px-3 py-1.5 text-xs transition-colors disabled:opacity-50"
              >
                {importAll.isPending ? <Loader2 size={12} className="animate-spin" /> : <ArrowDownToLine size={12} />}
                Import All New
              </button>
            )}
          </div>
        </div>

        {/* Import Selected bar */}
        {selected.size > 0 && (
          <div className="flex items-center gap-3 mb-3 bg-[#C9A84C]/10 border border-[#C9A84C]/20 rounded-lg px-4 py-2">
            <span className="text-xs text-[#C9A84C] font-medium">{selected.size} selected</span>
            <button
              onClick={handleImportSelected}
              disabled={importOne.isPending}
              className="inline-flex items-center gap-1.5 bg-[#C9A84C] hover:bg-[#b8952f] text-[#0D0D12] font-semibold rounded-md px-3 py-1 text-xs transition-colors disabled:opacity-50"
            >
              {importOne.isPending ? <Loader2 size={12} className="animate-spin" /> : <Import size={12} />}
              Import Selected
            </button>
          </div>
        )}

        {/* Transaction Table */}
        <div className="glass-card rounded-xl overflow-hidden">
          {loadingTx ? (
            <div className="p-8 flex items-center justify-center">
              <Loader2 size={24} className="animate-spin text-[#C9A84C]" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-[#6b6b80]">
                {importFilter === 'imported'
                  ? 'No imported transactions yet.'
                  : importFilter === 'not_imported'
                    ? 'All transactions have been imported.'
                    : 'No synced transactions. Try syncing your accounts.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="py-3 px-3 w-10">
                      {unimportedOnPage.length > 0 && (
                        <input
                          type="checkbox"
                          checked={allOnPageSelected}
                          onChange={handleToggleAll}
                          className="rounded bg-[#1e1e2a] border-white/[0.12] text-[#C9A84C] focus:ring-[#C9A84C]/30"
                        />
                      )}
                    </th>
                    <th className="py-3 px-3 text-left text-[10px] uppercase tracking-wider text-[#6b6b80] font-semibold">Date</th>
                    <th className="py-3 px-3 text-left text-[10px] uppercase tracking-wider text-[#6b6b80] font-semibold">Description</th>
                    <th className="py-3 px-3 text-right text-[10px] uppercase tracking-wider text-[#6b6b80] font-semibold">Amount</th>
                    <th className="py-3 px-3 text-left text-[10px] uppercase tracking-wider text-[#6b6b80] font-semibold">Account</th>
                    <th className="py-3 px-3 text-right text-[10px] uppercase tracking-wider text-[#6b6b80] font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(tx => (
                    <TransactionRow
                      key={tx.id}
                      tx={tx}
                      isSelected={selected.has(tx.id)}
                      onToggle={() => handleToggle(tx.id)}
                      onImport={() => handleImportOne(tx.id)}
                      isImporting={importOne.isPending}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
              <span className="text-xs text-[#6b6b80]">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded-md text-[#a1a1b5] hover:text-[#FAF8F5] hover:bg-white/[0.06] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1.5 rounded-md text-[#a1a1b5] hover:text-[#FAF8F5] hover:bg-white/[0.06] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function BankSync() {
  const { data: statusData, isLoading, isError, error } = useSimpleFinStatus();

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <Loader2 size={28} className="animate-spin text-[#C9A84C]" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <div className="max-w-lg mx-auto mt-12 glass-card rounded-2xl p-8 text-center">
          <AlertTriangle size={32} className="text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-[#FAF8F5] mb-2">Connection Error</h2>
          <p className="text-sm text-[#a1a1b5] mb-4">
            {(error as Error)?.message ?? 'Unable to load SimpleFIN status. Please try again.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 bg-[#C9A84C] hover:bg-[#b8952f] text-[#0D0D12] font-semibold rounded-lg px-4 py-2.5 text-sm transition-colors"
          >
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const isConnected = statusData?.connection != null;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#FAF8F5]">Bank Sync</h1>
      </div>
      {isConnected ? <ConnectedView /> : <SetupView />}
    </div>
  );
}
