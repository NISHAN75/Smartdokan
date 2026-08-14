import { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import { useCreateStockMovement } from '../../hooks/useStockMovements';

const EMPTY_FORM = {
  type: 'in',
  quantity: '',
  quantityChange: '',
  unitCost: '',
  reason: '',
  note: '',
};

const StockMovementFormModal = ({
  open,
  onClose,
  product,
  onSuccess,
}) => {
  const [form, setForm] =
    useState(EMPTY_FORM);

  const [error, setError] =
    useState('');

  const createMovement =
    useCreateStockMovement();

  useEffect(() => {
    if (open) {
      setForm({
        ...EMPTY_FORM,
        type:
          product?.movementType ||
          'in',
      });

      setError('');
    }
  }, [open, product?._id]);

  if (!product) {
    return null;
  }

  const setField = (
    name,
    value
  ) => {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit =
    async (e) => {
      e.preventDefault();

      setError('');

      if (
        form.type ===
        'adjustment'
      ) {
        if (
          form.quantityChange ===
            '' ||
          !Number.isInteger(
            Number(
              form.quantityChange
            )
          )
        ) {
          setError(
            'Adjustment must be a whole number. Use a negative value to reduce stock.'
          );

          return;
        }

        if (
          Number(
            form.quantityChange
          ) === 0
        ) {
          setError(
            'Adjustment cannot be zero.'
          );

          return;
        }
      } else {
        if (
          form.quantity === '' ||
          !Number.isInteger(
            Number(form.quantity)
          ) ||
          Number(form.quantity) <= 0
        ) {
          setError(
            'Quantity must be a positive whole number.'
          );

          return;
        }

        if (
          form.type === 'in' &&
          (
            form.unitCost === '' ||
            Number(form.unitCost) < 0 ||
            !Number.isFinite(
              Number(form.unitCost)
            )
          )
        ) {
          setError(
            'Unit cost is required and must be a valid non-negative number.'
          );

          return;
        }
      }

      try {
        const result =
          await createMovement.mutateAsync(
            {
              productId:
                product._id,

              type: form.type,

              quantity:
                form.type ===
                'adjustment'
                  ? undefined
                  : Number(
                      form.quantity
                    ),

              quantityChange:
                form.type ===
                'adjustment'
                  ? Number(
                      form.quantityChange
                    )
                  : undefined,

              unitCost:
                form.type === 'in'
                  ? Number(
                      form.unitCost
                    )
                  : undefined,

              reason:
                form.reason,

              note:
                form.note,
            }
          );

        onSuccess?.(result);

        onClose();
      } catch (err) {
        setError(
          err.response?.data
            ?.message ||
            'Failed to record stock movement.'
        );
      }
    };

  const title =
    form.type === 'in'
      ? 'Stock In'
      : form.type === 'out'
        ? 'Stock Out'
        : 'Stock Adjustment';

  return (
    <Modal
      open={open}
      onClose={
        createMovement.isPending
          ? () => {}
          : onClose
      }
      title={title}
      maxWidth="max-w-lg"
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <div className="rounded-md bg-slate-50 p-3 text-sm">
          <p className="font-medium text-slate-800">
            {product.name}
          </p>

          <p className="text-slate-500">
            SKU: {product.sku} ·
            Current stock:{' '}
            {product.stock}
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Movement Type
          </label>

          <select
            value={form.type}
            onChange={(e) =>
              setField(
                'type',
                e.target.value
              )
            }
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="in">
              Stock In
            </option>

            <option value="out">
              Stock Out
            </option>

            <option value="adjustment">
              Adjustment
            </option>
          </select>
        </div>

        {form.type ===
        'adjustment' ? (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Adjustment
            </label>

            <input
              type="number"
              step="1"
              value={
                form.quantityChange
              }
              onChange={(e) =>
                setField(
                  'quantityChange',
                  e.target.value
                )
              }
              placeholder="e.g. 5 or -3"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />

            <p className="mt-1 text-xs text-slate-500">
              Positive adds stock;
              negative removes stock.
            </p>
          </div>
        ) : (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Quantity
            </label>

            <input
              type="number"
              min="1"
              step="1"
              value={
                form.quantity
              }
              onChange={(e) =>
                setField(
                  'quantity',
                  e.target.value
                )
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        )}

        {form.type === 'in' && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Unit Cost
            </label>

            <input
              type="number"
              min="0"
              step="0.01"
              value={
                form.unitCost
              }
              onChange={(e) =>
                setField(
                  'unitCost',
                  e.target.value
                )
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Reason
          </label>

          <input
            value={form.reason}
            onChange={(e) =>
              setField(
                'reason',
                e.target.value
              )
            }
            maxLength={300}
            placeholder="Why is stock changing?"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Note
          </label>

          <textarea
            value={form.note}
            onChange={(e) =>
              setField(
                'note',
                e.target.value
              )
            }
            maxLength={300}
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        {error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={
              createMovement.isPending
            }
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={
              createMovement.isPending
            }
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {createMovement.isPending
              ? 'Saving...'
              : 'Save Movement'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default StockMovementFormModal;