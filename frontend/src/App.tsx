import { Routes, Route } from 'react-router-dom';
import AppShell from './components/ui/AppShell';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import TransactionForm from './pages/TransactionForm';
import Budgets from './pages/Budgets';
import Investments from './pages/Investments';
import InvestmentDetail from './pages/InvestmentDetail';
import SavingsGoals from './pages/SavingsGoals';
import Debts from './pages/Debts';
import Import from './pages/Import';
import Settings from './pages/Settings';

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/transactions/new" element={<TransactionForm />} />
        <Route path="/transactions/:id/edit" element={<TransactionForm />} />
        <Route path="/budgets" element={<Budgets />} />
        <Route path="/investments" element={<Investments />} />
        <Route path="/investments/:id" element={<InvestmentDetail />} />
        <Route path="/savings-goals" element={<SavingsGoals />} />
        <Route path="/debts" element={<Debts />} />
        <Route path="/import" element={<Import />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
