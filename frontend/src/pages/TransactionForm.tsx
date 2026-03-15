import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Sparkles, AlertTriangle } from 'lucide-react';
import { useTransaction, useCreateTransaction, useUpdateTransaction, useSuggestCategory, useCheckDuplicates } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { useTags } from '../hooks/useTags';
import { toCents, toDollars, formatCents } from '../lib/format';

const schema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().positive('Amount must be positive'),
  description: z.string().min(1, 'Description is required'),
  date: z.string().min(1, 'Date is required'),
  category_id: z.number().nullable().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function TransactionForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { data: existing, isLoading: loadingExisting } = useTransaction(
    isEditing ? Number(id) : undefined
  );

  const createTransaction = useCreateTransaction();
  const updateTransaction = useUpdateTransaction();
  const { data: tags } = useTags();
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [debouncedDescription, setDebouncedDescription] = useState('');
  const [manualCategorySelected, setManualCategorySelected] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'expense',
      amount: 0,
      description: '',
      date: new Date().toISOString().split('T')[0],
      category_id: null,
      notes: '',
    },
  });

  const selectedType = watch('type');
  const watchedDescription = watch('description');
  const watchedCategoryId = watch('category_id');
  const watchedAmount = watch('amount');
  const watchedDate = watch('date');
  const { data: categories } = useCategories(selectedType);

  // Duplicate detection (only when creating)
  const { data: duplicateData } = useCheckDuplicates(
    !isEditing ? toCents(watchedAmount || 0) : 0,
    debouncedDescription,
    watchedDate || ''
  );

  // Debounce description for auto-categorize
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedDescription(watchedDescription || '');
    }, 300);
    return () => clearTimeout(timer);
  }, [watchedDescription]);

  const { data: suggestion } = useSuggestCategory(debouncedDescription);

  useEffect(() => {
    if (existing && isEditing) {
      reset({
        type: existing.type,
        amount: toDollars(existing.amount),
        description: existing.description,
        date: existing.date,
        category_id: existing.category_id,
        notes: existing.notes || '',
      });
      if (existing.tags && Array.isArray(existing.tags)) {
        setSelectedTagIds(existing.tags.map((t: { id: number }) => t.id));
      }
    }
  }, [existing, isEditing, reset]);

  const onSubmit = async (values: FormValues) => {
    const payload = {
      ...values,
      amount: toCents(values.amount),
      category_id: values.category_id || null,
      tag_ids: selectedTagIds.length > 0 ? selectedTagIds : undefined,
    };

    if (isEditing) {
      await updateTransaction.mutateAsync({ id: Number(id), ...payload });
    } else {
      await createTransaction.mutateAsync(payload);
    }
    navigate('/transactions');
  };

  if (isEditing && loadingExisting) {
    return <div className="p-6 text-gray-400">Loading transaction...</div>;
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">
        {isEditing ? 'Edit Transaction' : 'New Transaction'}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Type Toggle */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Type</label>
          <div className="flex gap-2">
            {(['income', 'expense'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setValue('type', t);
                  setValue('category_id', null);
                  setManualCategorySelected(false);
                }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                  selectedType === t
                    ? t === 'income'
                      ? 'bg-green-600 text-white'
                      : 'bg-red-600 text-white'
                    : 'bg-gray-800 text-gray-400 border border-gray-700 hover:text-gray-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Amount ($)</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            {...register('amount', { valueAsNumber: true })}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0.00"
          />
          {errors.amount && <p className="text-red-400 text-sm mt-1">{errors.amount.message}</p>}
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Category</label>
          <select
            {...register('category_id', {
              setValueAs: (v) => (v === '' || v === null ? null : Number(v)),
              onChange: () => setManualCategorySelected(true),
            })}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select category</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {/* Feature 5: Auto-Categorize suggestion */}
          {suggestion && !manualCategorySelected && !watchedCategoryId && (
            <div className="flex items-center gap-2 mt-2 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
              <Sparkles size={14} className="text-blue-400 shrink-0" />
              <span className="text-sm text-blue-300">
                Suggested: {suggestion.category_icon} {suggestion.category_name}
                {suggestion.match_count > 0 && ` (based on ${suggestion.match_count} similar transactions)`}
              </span>
              <button
                type="button"
                onClick={() => {
                  setValue('category_id', suggestion.category_id);
                }}
                className="ml-auto text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md transition-colors shrink-0"
              >
                Apply
              </button>
            </div>
          )}
        </div>

        {/* Tags */}
        {tags && tags.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Tags</label>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const isSelected = selectedTagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => {
                      setSelectedTagIds((prev) =>
                        isSelected ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]
                      );
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors border ${
                      isSelected
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: tag.color || '#6b7280' }}
                    />
                    {tag.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Date</label>
          <input
            type="date"
            {...register('date')}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.date && <p className="text-red-400 text-sm mt-1">{errors.date.message}</p>}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Description</label>
          <input
            type="text"
            {...register('description')}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="What was this for?"
          />
          {errors.description && (
            <p className="text-red-400 text-sm mt-1">{errors.description.message}</p>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Notes (optional)</label>
          <textarea
            {...register('notes')}
            rows={3}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Any additional notes..."
          />
        </div>

        {/* Duplicate Detection Warning */}
        {!isEditing && duplicateData && duplicateData.count > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-4 py-3">
            {duplicateData.duplicates.map((dup) => (
              <div key={dup.id} className="flex items-center gap-2 text-sm text-yellow-400">
                <AlertTriangle size={16} className="shrink-0" />
                <span>
                  Possible duplicate: {dup.description} for {formatCents(dup.amount)} on {dup.date}. Is this intentional?
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Create'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/transactions')}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
