import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Pencil, Lock, X, Download } from 'lucide-react';
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '../hooks/useCategories';
import { useRecurring, useCreateRecurring, useDeleteRecurring, useGenerateRecurring } from '../hooks/useRecurring';
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

      {isLoading ? (
        <div className="text-gray-400">Loading categories...</div>
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
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            Add Template
          </button>
        </div>
      </div>

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

      {isLoading ? (
        <div className="text-gray-400">Loading recurring templates...</div>
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

      {isLoading ? (
        <div className="text-gray-400">Loading tags...</div>
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
