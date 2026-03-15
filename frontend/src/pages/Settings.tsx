import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Pencil, Lock, X, Download, Wand2, Check, ChevronRight, ChevronLeft, DollarSign, Home, Shield, Car, Tv, Briefcase, TrendingUp, Zap, Droplets, Flame, Wifi, Phone, Heart, CarFront, Bus, Cloud, Dumbbell } from 'lucide-react';
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '../hooks/useCategories';
import { useRecurring, useCreateRecurring, useDeleteRecurring, useGenerateRecurring, useBulkCreateRecurring } from '../hooks/useRecurring';
import { useTags, useCreateTag, useUpdateTag, useDeleteTag } from '../hooks/useTags';
import { formatCents, formatDate, toCents } from '../lib/format';
import api from '../lib/api';

type Tab = 'categories' | 'recurring' | 'tags' | 'data';

// Category schemas
const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['income', 'expense']),
  color: z.string().optional(),
  icon: z.string().optional(),
});
type CategoryForm = z.infer<typeof categorySchema>;

// Recurring schemas
const recurringSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().positive('Amount must be positive'),
  description: z.string().min(1, 'Description is required'),
  category_id: z.number().optional(),
  frequency: z.string().min(1, 'Frequency is required'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional(),
});
type RecurringForm = z.infer<typeof recurringSchema>;

// Tag schemas
const tagSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  color: z.string().optional(),
});
type TagForm = z.infer<typeof tagSchema>;

export default function Settings() {
  const [tab, setTab] = useState<Tab>('categories');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'categories', label: 'Categories' },
    { key: 'recurring', label: 'Recurring' },
    { key: 'tags', label: 'Tags' },
    { key: 'data', label: 'Data' },
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 rounded-lg p-1 border border-gray-800 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-gray-800 text-gray-100'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'categories' && <CategoriesTab />}
      {tab === 'recurring' && <RecurringTab />}
      {tab === 'tags' && <TagsTab />}
      {tab === 'data' && <DataTab />}
    </div>
  );
}

function CategoriesTab() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: categories, isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const form = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
    defaultValues: { type: 'expense' },
  });

  const onSubmit = async (values: CategoryForm) => {
    if (editingId) {
      await updateCategory.mutateAsync({ id: editingId, ...values });
      setEditingId(null);
    } else {
      await createCategory.mutateAsync(values);
    }
    form.reset({ type: 'expense' });
    setShowForm(false);
  };

  const startEdit = (cat: { id: number; name: string; type: 'income' | 'expense'; color: string | null; icon: string | null }) => {
    form.reset({
      name: cat.name,
      type: cat.type,
      color: cat.color || '',
      icon: cat.icon || '',
    });
    setEditingId(cat.id);
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Delete this category?')) {
      deleteCategory.mutate(id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Categories</h2>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); form.reset({ type: 'expense' }); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Add Category
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">{editingId ? 'Edit Category' : 'New Category'}</h3>
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="text-gray-400 hover:text-gray-200">
              <X size={20} />
            </button>
          </div>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[160px]">
              <label className="block text-sm text-gray-400 mb-1">Name</label>
              <input
                {...form.register('name')}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {form.formState.errors.name && (
                <p className="text-red-400 text-xs mt-1">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="w-32">
              <label className="block text-sm text-gray-400 mb-1">Type</label>
              <select
                {...form.register('type')}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            <div className="w-20">
              <label className="block text-sm text-gray-400 mb-1">Color</label>
              <input
                type="color"
                {...form.register('color')}
                className="w-full h-9 bg-gray-800 border border-gray-700 rounded-lg cursor-pointer"
              />
            </div>
            <div className="w-24">
              <label className="block text-sm text-gray-400 mb-1">Icon</label>
              <input
                {...form.register('icon')}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="emoji"
              />
            </div>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {editingId ? 'Update' : 'Create'}
            </button>
          </form>
        </div>
      )}

      {createCategory.isError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
          {(createCategory.error as any)?.response?.data?.error?.message || 'Failed to save category. Please try again.'}
        </div>
      )}
      {deleteCategory.isError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
          {(deleteCategory.error as any)?.response?.data?.error?.message || 'Failed to delete category. Please try again.'}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-12 bg-gray-800 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 text-left text-sm text-gray-400">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Color</th>
                <th className="px-5 py-3 font-medium">Icon</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories?.map((c) => (
                <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-5 py-3 text-sm text-gray-200">
                    <div className="flex items-center gap-2">
                      {c.name}
                      {c.is_default === 1 && (
                        <Lock size={12} className="text-gray-500" />
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm">
                    <span className={`text-xs px-2 py-0.5 rounded capitalize ${
                      c.type === 'income' ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'
                    }`}>
                      {c.type}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm">
                    {c.color ? (
                      <span className="w-4 h-4 rounded-full inline-block" style={{ backgroundColor: c.color }} />
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-300">{c.icon || '-'}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => startEdit(c)}
                        className="p-1.5 text-gray-400 hover:text-blue-400 transition-colors"
                      >
                        <Pencil size={15} />
                      </button>
                      {c.is_default !== 1 && (
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RecurringTab() {
  const [showForm, setShowForm] = useState(false);
  const [showWizard, setShowWizard] = useState(false);

  const { data: templates, isLoading } = useRecurring();
  const { data: categories } = useCategories();
  const createRecurring = useCreateRecurring();
  const deleteRecurring = useDeleteRecurring();
  const generateRecurring = useGenerateRecurring();

  const form = useForm<RecurringForm>({
    resolver: zodResolver(recurringSchema),
    defaultValues: {
      type: 'expense',
      frequency: 'monthly',
      start_date: new Date().toISOString().split('T')[0],
    },
  });

  const onSubmit = async (values: RecurringForm) => {
    await createRecurring.mutateAsync({
      ...values,
      amount: toCents(values.amount),
      end_date: values.end_date || undefined,
    });
    form.reset({
      type: 'expense',
      frequency: 'monthly',
      start_date: new Date().toISOString().split('T')[0],
    });
    setShowForm(false);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Delete this recurring template?')) {
      deleteRecurring.mutate(id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recurring Templates</h2>
        <div className="flex gap-2">
          <button
            onClick={() => generateRecurring.mutate()}
            disabled={generateRecurring.isPending}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm transition-colors"
          >
            {generateRecurring.isPending ? 'Generating...' : 'Generate Due Transactions'}
          </button>
          <button
            onClick={() => setShowWizard(true)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Wand2 size={16} />
            Quick Setup
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            Add Template
          </button>
        </div>
      </div>

      {showWizard && (
        <RecurringWizard onClose={() => setShowWizard(false)} />
      )}

      {showForm && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">New Recurring Template</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-200">
              <X size={20} />
            </button>
          </div>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Description</label>
              <input
                {...form.register('description')}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Netflix subscription"
              />
              {form.formState.errors.description && (
                <p className="text-red-400 text-xs mt-1">{form.formState.errors.description.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Type</label>
              <select
                {...form.register('type')}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Amount ($)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                {...form.register('amount', { valueAsNumber: true })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
              {form.formState.errors.amount && (
                <p className="text-red-400 text-xs mt-1">{form.formState.errors.amount.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Category</label>
              <select
                {...form.register('category_id', { valueAsNumber: true })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">None</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Frequency</label>
              <select
                {...form.register('frequency')}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Biweekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Start Date</label>
              <input
                type="date"
                {...form.register('start_date')}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">End Date (optional)</label>
              <input
                type="date"
                {...form.register('end_date')}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {form.formState.isSubmitting ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {createRecurring.isError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
          {(createRecurring.error as any)?.response?.data?.error?.message || 'Failed to create template. Please try again.'}
        </div>
      )}
      {deleteRecurring.isError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
          {(deleteRecurring.error as any)?.response?.data?.error?.message || 'Failed to delete template. Please try again.'}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => (
            <div key={i} className="h-12 bg-gray-800 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : templates && templates.length > 0 ? (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 text-left text-sm text-gray-400">
                <th className="px-5 py-3 font-medium">Description</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Amount</th>
                <th className="px-5 py-3 font-medium">Frequency</th>
                <th className="px-5 py-3 font-medium">Next Due</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-5 py-3 text-sm text-gray-200">{t.description}</td>
                  <td className="px-5 py-3 text-sm">
                    <span className={`text-xs px-2 py-0.5 rounded capitalize ${
                      t.type === 'income' ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'
                    }`}>
                      {t.type}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-300">{formatCents(t.amount)}</td>
                  <td className="px-5 py-3 text-sm text-gray-300 capitalize">{t.frequency}</td>
                  <td className="px-5 py-3 text-sm text-gray-300">{formatDate(t.next_due)}</td>
                  <td className="px-5 py-3 text-sm">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      t.is_active ? 'bg-green-400/10 text-green-400' : 'bg-gray-700 text-gray-400'
                    }`}>
                      {t.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center">
          <p className="text-gray-400 mb-4">No recurring templates.</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            Create your first template
          </button>
        </div>
      )}
    </div>
  );
}

// === Recurring Wizard Types & Data ===

interface WizardItem {
  id: string;
  description: string;
  type: 'income' | 'expense';
  frequency: string;
  defaultAmount: number; // in cents, 0 means user must fill in
  enabled: boolean;
  amount: number; // in cents
  categoryMapping: string; // name to match against categories
  section?: string;
}

const INCOME_ITEMS: Omit<WizardItem, 'enabled' | 'amount'>[] = [
  { id: 'salary-monthly', description: 'Salary', type: 'income', frequency: 'monthly', defaultAmount: 0, categoryMapping: 'Salary' },
  { id: 'salary-biweekly', description: 'Salary (biweekly)', type: 'income', frequency: 'biweekly', defaultAmount: 0, categoryMapping: 'Salary' },
  { id: 'freelance', description: 'Freelance / Side Income', type: 'income', frequency: 'monthly', defaultAmount: 0, categoryMapping: 'Freelance' },
  { id: 'dividends', description: 'Interest / Dividends', type: 'income', frequency: 'monthly', defaultAmount: 0, categoryMapping: 'Interest/Dividends' },
];

interface ExpenseSection {
  title: string;
  icon: React.ReactNode;
  items: Omit<WizardItem, 'enabled' | 'amount'>[];
}

const EXPENSE_SECTIONS: ExpenseSection[] = [
  {
    title: 'Housing & Utilities',
    icon: <Home size={16} />,
    items: [
      { id: 'rent', description: 'Rent / Mortgage', type: 'expense', frequency: 'monthly', defaultAmount: 0, categoryMapping: 'Rent/Mortgage' },
      { id: 'electric', description: 'Electric Bill', type: 'expense', frequency: 'monthly', defaultAmount: 0, categoryMapping: 'Utilities' },
      { id: 'water', description: 'Water Bill', type: 'expense', frequency: 'monthly', defaultAmount: 0, categoryMapping: 'Utilities' },
      { id: 'gas-heating', description: 'Gas / Heating', type: 'expense', frequency: 'monthly', defaultAmount: 0, categoryMapping: 'Utilities' },
      { id: 'internet', description: 'Internet', type: 'expense', frequency: 'monthly', defaultAmount: 0, categoryMapping: 'Utilities' },
      { id: 'phone', description: 'Phone Plan', type: 'expense', frequency: 'monthly', defaultAmount: 0, categoryMapping: 'Utilities' },
    ],
  },
  {
    title: 'Insurance',
    icon: <Shield size={16} />,
    items: [
      { id: 'health-ins', description: 'Health Insurance', type: 'expense', frequency: 'monthly', defaultAmount: 0, categoryMapping: 'Insurance' },
      { id: 'car-ins', description: 'Car Insurance', type: 'expense', frequency: 'monthly', defaultAmount: 0, categoryMapping: 'Insurance' },
      { id: 'home-ins', description: "Renter's / Home Insurance", type: 'expense', frequency: 'monthly', defaultAmount: 0, categoryMapping: 'Insurance' },
    ],
  },
  {
    title: 'Transportation',
    icon: <Car size={16} />,
    items: [
      { id: 'car-payment', description: 'Car Payment', type: 'expense', frequency: 'monthly', defaultAmount: 0, categoryMapping: 'Transportation' },
      { id: 'gas-fuel', description: 'Gas / Fuel', type: 'expense', frequency: 'monthly', defaultAmount: 0, categoryMapping: 'Transportation' },
      { id: 'transit', description: 'Public Transit Pass', type: 'expense', frequency: 'monthly', defaultAmount: 0, categoryMapping: 'Transportation' },
    ],
  },
  {
    title: 'Subscriptions',
    icon: <Tv size={16} />,
    items: [
      { id: 'netflix', description: 'Netflix', type: 'expense', frequency: 'monthly', defaultAmount: 1599, categoryMapping: 'Subscriptions' },
      { id: 'spotify', description: 'Spotify', type: 'expense', frequency: 'monthly', defaultAmount: 1099, categoryMapping: 'Subscriptions' },
      { id: 'gym', description: 'Gym Membership', type: 'expense', frequency: 'monthly', defaultAmount: 0, categoryMapping: 'Subscriptions' },
      { id: 'cloud', description: 'Cloud Storage', type: 'expense', frequency: 'monthly', defaultAmount: 0, categoryMapping: 'Subscriptions' },
    ],
  },
];

function getFrequencyMultiplier(frequency: string): number {
  switch (frequency) {
    case 'weekly': return 52 / 12;
    case 'biweekly': return 26 / 12;
    case 'monthly': return 1;
    case 'quarterly': return 1 / 3;
    case 'yearly': return 1 / 12;
    default: return 1;
  }
}

function RecurringWizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);
  const { data: categories } = useCategories();
  const bulkCreate = useBulkCreateRecurring();

  // Income items state
  const [incomeItems, setIncomeItems] = useState<WizardItem[]>(
    INCOME_ITEMS.map((item) => ({
      ...item,
      enabled: item.id === 'salary-monthly',
      amount: item.defaultAmount,
    }))
  );

  // Expense items state
  const [expenseItems, setExpenseItems] = useState<WizardItem[]>(
    EXPENSE_SECTIONS.flatMap((section) =>
      section.items.map((item) => ({
        ...item,
        enabled: item.id === 'rent',
        amount: item.defaultAmount,
        section: section.title,
      }))
    )
  );

  const toggleIncome = (id: string) => {
    setIncomeItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item))
    );
  };

  const setIncomeAmount = (id: string, dollars: number) => {
    setIncomeItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, amount: toCents(dollars) } : item))
    );
  };

  const setIncomeFrequency = (id: string, frequency: string) => {
    setIncomeItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, frequency } : item))
    );
  };

  const toggleExpense = (id: string) => {
    setExpenseItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item))
    );
  };

  const setExpenseAmount = (id: string, dollars: number) => {
    setExpenseItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, amount: toCents(dollars) } : item))
    );
  };

  const setExpenseFrequency = (id: string, frequency: string) => {
    setExpenseItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, frequency } : item))
    );
  };

  const enabledIncome = incomeItems.filter((i) => i.enabled && i.amount > 0);
  const enabledExpenses = expenseItems.filter((i) => i.enabled && i.amount > 0);

  const monthlyIncome = useMemo(
    () => enabledIncome.reduce((sum, i) => sum + i.amount * getFrequencyMultiplier(i.frequency), 0),
    [enabledIncome]
  );
  const monthlyExpenses = useMemo(
    () => enabledExpenses.reduce((sum, i) => sum + i.amount * getFrequencyMultiplier(i.frequency), 0),
    [enabledExpenses]
  );
  const net = monthlyIncome - monthlyExpenses;

  const findCategoryId = (mappingName: string, type: 'income' | 'expense'): number | undefined => {
    if (!categories) return undefined;

    // Exact match first
    const exact = categories.find(
      (c) => c.name.toLowerCase() === mappingName.toLowerCase() && c.type === type
    );
    if (exact) return exact.id;

    // Partial match
    const partial = categories.find(
      (c) =>
        (c.name.toLowerCase().includes(mappingName.toLowerCase()) ||
          mappingName.toLowerCase().includes(c.name.toLowerCase())) &&
        c.type === type
    );
    if (partial) return partial.id;

    // Fallback: "Other Income" or "Other Expense"
    const fallbackName = type === 'income' ? 'other income' : 'other expense';
    const fallback = categories.find(
      (c) => c.name.toLowerCase() === fallbackName && c.type === type
    );
    if (fallback) return fallback.id;

    // Last resort: first category of the correct type
    const anyOfType = categories.find((c) => c.type === type);
    return anyOfType?.id;
  };

  const handleCreate = async () => {
    const allItems = [...enabledIncome, ...enabledExpenses];
    if (allItems.length === 0) return;

    const now = new Date();
    const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    const templates = allItems.map((item) => ({
      type: item.type,
      amount: item.amount,
      description: item.description,
      category_id: findCategoryId(item.categoryMapping, item.type) || 0,
      frequency: item.frequency,
      start_date: startDate,
    }));

    await bulkCreate.mutateAsync(templates);
    onClose();
  };

  const iconForItem = (id: string): React.ReactNode => {
    switch (id) {
      case 'salary-monthly':
      case 'salary-biweekly':
        return <Briefcase size={18} />;
      case 'freelance':
        return <DollarSign size={18} />;
      case 'dividends':
        return <TrendingUp size={18} />;
      case 'rent':
        return <Home size={18} />;
      case 'electric':
        return <Zap size={18} />;
      case 'water':
        return <Droplets size={18} />;
      case 'gas-heating':
        return <Flame size={18} />;
      case 'internet':
        return <Wifi size={18} />;
      case 'phone':
        return <Phone size={18} />;
      case 'health-ins':
        return <Heart size={18} />;
      case 'car-ins':
      case 'car-payment':
        return <CarFront size={18} />;
      case 'home-ins':
        return <Shield size={18} />;
      case 'gas-fuel':
        return <Car size={18} />;
      case 'transit':
        return <Bus size={18} />;
      case 'netflix':
      case 'spotify':
        return <Tv size={18} />;
      case 'gym':
        return <Dumbbell size={18} />;
      case 'cloud':
        return <Cloud size={18} />;
      default:
        return <DollarSign size={18} />;
    }
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-purple-500/20 rounded-lg flex items-center justify-center">
            <Wand2 size={18} className="text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-100">Recurring Setup Wizard</h3>
            <p className="text-xs text-gray-400">Quickly set up your regular income and expenses</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
          <X size={20} />
        </button>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                s === step
                  ? 'bg-purple-600 text-white'
                  : s < step
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-800 text-gray-500'
              }`}
            >
              {s < step ? <Check size={14} /> : s}
            </div>
            <span
              className={`text-xs hidden sm:inline ${
                s === step ? 'text-gray-200' : 'text-gray-500'
              }`}
            >
              {s === 1 ? 'Income' : s === 2 ? 'Expenses' : 'Review'}
            </span>
            {s < 3 && <div className={`flex-1 h-px ${s < step ? 'bg-green-600' : 'bg-gray-700'}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Income */}
      {step === 1 && (
        <div>
          <h4 className="text-lg font-medium text-gray-100 mb-1">What's your income?</h4>
          <p className="text-sm text-gray-400 mb-4">Select your income sources and enter the amounts.</p>
          <div className="space-y-3">
            {incomeItems.map((item) => (
              <div
                key={item.id}
                className={`rounded-lg border p-4 transition-colors cursor-pointer ${
                  item.enabled
                    ? 'bg-green-500/5 border-green-500/30'
                    : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                }`}
                onClick={() => toggleIncome(item.id)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      item.enabled ? 'bg-green-600 border-green-600' : 'border-gray-600'
                    }`}
                  >
                    {item.enabled && <Check size={12} className="text-white" />}
                  </div>
                  <div className="text-green-400">{iconForItem(item.id)}</div>
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-200">{item.description}</span>
                    <span className="text-xs text-gray-500 ml-2 capitalize">{item.frequency}</span>
                  </div>
                </div>
                {item.enabled && (
                  <div className="mt-3 flex items-center gap-3 ml-8" onClick={(e) => e.stopPropagation()}>
                    <div className="relative flex-1 max-w-[200px]">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.amount > 0 ? (item.amount / 100).toFixed(2) : ''}
                        onChange={(e) => setIncomeAmount(item.id, parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg pl-7 pr-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <select
                      value={item.frequency}
                      onChange={(e) => setIncomeFrequency(item.id, e.target.value)}
                      className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Biweekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Expenses */}
      {step === 2 && (
        <div>
          <h4 className="text-lg font-medium text-gray-100 mb-1">What are your regular bills?</h4>
          <p className="text-sm text-gray-400 mb-4">Select the recurring expenses that apply to you.</p>
          <div className="space-y-6">
            {EXPENSE_SECTIONS.map((section) => (
              <div key={section.title}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-gray-400">{section.icon}</span>
                  <h5 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">{section.title}</h5>
                </div>
                <div className="space-y-2">
                  {section.items.map((sectionItem) => {
                    const item = expenseItems.find((e) => e.id === sectionItem.id)!;
                    return (
                      <div
                        key={item.id}
                        className={`rounded-lg border p-3 transition-colors cursor-pointer ${
                          item.enabled
                            ? 'bg-red-500/5 border-red-500/30'
                            : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                        }`}
                        onClick={() => toggleExpense(item.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                              item.enabled ? 'bg-red-600 border-red-600' : 'border-gray-600'
                            }`}
                          >
                            {item.enabled && <Check size={12} className="text-white" />}
                          </div>
                          <div className="text-red-400">{iconForItem(item.id)}</div>
                          <span className="text-sm font-medium text-gray-200 flex-1">{item.description}</span>
                          {item.defaultAmount > 0 && !item.enabled && (
                            <span className="text-xs text-gray-500">{formatCents(item.defaultAmount)}/mo</span>
                          )}
                        </div>
                        {item.enabled && (
                          <div className="mt-3 flex items-center gap-3 ml-8" onClick={(e) => e.stopPropagation()}>
                            <div className="relative flex-1 max-w-[200px]">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.amount > 0 ? (item.amount / 100).toFixed(2) : ''}
                                onChange={(e) => setExpenseAmount(item.id, parseFloat(e.target.value) || 0)}
                                placeholder="0.00"
                                className="w-full bg-gray-800 border border-gray-600 rounded-lg pl-7 pr-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                              />
                            </div>
                            <select
                              value={item.frequency}
                              onChange={(e) => setExpenseFrequency(item.id, e.target.value)}
                              className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                            >
                              <option value="weekly">Weekly</option>
                              <option value="biweekly">Biweekly</option>
                              <option value="monthly">Monthly</option>
                              <option value="quarterly">Quarterly</option>
                              <option value="yearly">Yearly</option>
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div>
          <h4 className="text-lg font-medium text-gray-100 mb-1">Review your recurring transactions</h4>
          <p className="text-sm text-gray-400 mb-4">Confirm everything looks good before creating.</p>

          {enabledIncome.length > 0 && (
            <div className="mb-4">
              <h5 className="text-sm font-semibold text-green-400 mb-2 uppercase tracking-wide">Income</h5>
              <div className="bg-gray-800/50 rounded-lg border border-gray-700 divide-y divide-gray-700">
                {enabledIncome.map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="text-green-400">{iconForItem(item.id)}</div>
                      <span className="text-sm text-gray-200">{item.description}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 capitalize">{item.frequency}</span>
                      <span className="text-sm font-medium text-green-400">{formatCents(item.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {enabledExpenses.length > 0 && (
            <div className="mb-4">
              <h5 className="text-sm font-semibold text-red-400 mb-2 uppercase tracking-wide">Expenses</h5>
              <div className="bg-gray-800/50 rounded-lg border border-gray-700 divide-y divide-gray-700">
                {enabledExpenses.map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="text-red-400">{iconForItem(item.id)}</div>
                      <span className="text-sm text-gray-200">{item.description}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 capitalize">{item.frequency}</span>
                      <span className="text-sm font-medium text-red-400">{formatCents(item.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {enabledIncome.length === 0 && enabledExpenses.length === 0 && (
            <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-8 text-center mb-4">
              <p className="text-gray-400">No items selected. Go back and select some income or expenses.</p>
            </div>
          )}

          {/* Totals */}
          <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Monthly Income</span>
              <span className="text-green-400 font-medium">{formatCents(Math.round(monthlyIncome))}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Monthly Expenses</span>
              <span className="text-red-400 font-medium">{formatCents(Math.round(monthlyExpenses))}</span>
            </div>
            <div className="border-t border-gray-700 pt-2 flex justify-between text-sm font-semibold">
              <span className="text-gray-300">Net</span>
              <span className={net >= 0 ? 'text-green-400' : 'text-red-400'}>
                {net >= 0 ? '+' : '-'}{formatCents(Math.abs(Math.round(net)))}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-800">
        <div>
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-1 text-gray-400 hover:text-gray-200 text-sm transition-colors"
            >
              <ChevronLeft size={16} />
              Back
            </button>
          )}
        </div>
        <div>
          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Next
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={bulkCreate.isPending || (enabledIncome.length === 0 && enabledExpenses.length === 0)}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {bulkCreate.isPending ? (
                'Creating...'
              ) : (
                <>
                  <Check size={16} />
                  Create All Templates
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {bulkCreate.isError && (
        <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
          Failed to create templates. Please try again.
        </div>
      )}
    </div>
  );
}

function TagsTab() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: tags, isLoading } = useTags();
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();

  const form = useForm<TagForm>({
    resolver: zodResolver(tagSchema),
  });

  const onSubmit = async (values: TagForm) => {
    if (editingId) {
      await updateTag.mutateAsync({ id: editingId, ...values });
      setEditingId(null);
    } else {
      await createTag.mutateAsync(values);
    }
    form.reset();
    setShowForm(false);
  };

  const startEdit = (tag: { id: number; name: string; color: string | null }) => {
    form.reset({ name: tag.name, color: tag.color || '' });
    setEditingId(tag.id);
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Delete this tag?')) {
      deleteTag.mutate(id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Tags</h2>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); form.reset(); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Add Tag
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">{editingId ? 'Edit Tag' : 'New Tag'}</h3>
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="text-gray-400 hover:text-gray-200">
              <X size={20} />
            </button>
          </div>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[160px]">
              <label className="block text-sm text-gray-400 mb-1">Name</label>
              <input
                {...form.register('name')}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {form.formState.errors.name && (
                <p className="text-red-400 text-xs mt-1">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="w-20">
              <label className="block text-sm text-gray-400 mb-1">Color</label>
              <input
                type="color"
                {...form.register('color')}
                className="w-full h-9 bg-gray-800 border border-gray-700 rounded-lg cursor-pointer"
              />
            </div>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {editingId ? 'Update' : 'Create'}
            </button>
          </form>
        </div>
      )}

      {createTag.isError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
          {(createTag.error as any)?.response?.data?.error?.message || 'Failed to save tag. Please try again.'}
        </div>
      )}
      {deleteTag.isError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
          {(deleteTag.error as any)?.response?.data?.error?.message || 'Failed to delete tag. Please try again.'}
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-wrap gap-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-9 w-24 bg-gray-800 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : tags && tags.length > 0 ? (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <div className="flex flex-wrap gap-3">
            {tags.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
              >
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: t.color || '#6b7280' }}
                />
                <span className="text-sm text-gray-200">{t.name}</span>
                <button
                  onClick={() => startEdit(t)}
                  className="text-gray-400 hover:text-blue-400 transition-colors ml-1"
                >
                  <Pencil size={12} />
                </button>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="text-gray-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center">
          <p className="text-gray-400 mb-4">No tags created yet.</p>
          <button
            onClick={() => { setShowForm(true); form.reset(); }}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            Create your first tag
          </button>
        </div>
      )}
    </div>
  );
}

function DataTab() {
  const [exporting, setExporting] = useState<string | null>(null);

  const handleExport = async (format: 'csv' | 'json' | 'backup') => {
    setExporting(format);
    try {
      const endpoint = format === 'backup' ? '/export/backup' : `/export/transactions?format=${format}`;
      const response = await api.get(endpoint, { responseType: 'blob' });
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = format === 'backup' ? 'json' : format;
      a.download = `finance-buddy-${format}-${new Date().toISOString().split('T')[0]}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed. Please try again.');
    }
    setExporting(null);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Data Management</h2>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <h3 className="font-medium text-gray-200 mb-3">Export Data</h3>
        <p className="text-sm text-gray-400 mb-4">Download your financial data in various formats.</p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleExport('csv')}
            disabled={exporting === 'csv'}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-4 py-2.5 rounded-lg text-sm transition-colors"
          >
            <Download size={16} />
            {exporting === 'csv' ? 'Exporting...' : 'Export CSV'}
          </button>
          <button
            onClick={() => handleExport('json')}
            disabled={exporting === 'json'}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-4 py-2.5 rounded-lg text-sm transition-colors"
          >
            <Download size={16} />
            {exporting === 'json' ? 'Exporting...' : 'Export JSON'}
          </button>
          <button
            onClick={() => handleExport('backup')}
            disabled={exporting === 'backup'}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <Download size={16} />
            {exporting === 'backup' ? 'Exporting...' : 'Full Backup'}
          </button>
        </div>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <h3 className="font-medium text-gray-200 mb-3">Import Data</h3>
        <p className="text-sm text-gray-400 mb-4">
          Use the Import page to import transactions from CSV files.
        </p>
        <a
          href="/import"
          className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-4 py-2.5 rounded-lg text-sm transition-colors"
        >
          Go to Import
        </a>
      </div>
    </div>
  );
}
