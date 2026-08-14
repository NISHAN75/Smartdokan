import { useMemo, useState } from 'react';

import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardEdit,
  History,
  Search,
  AlertCircle,
} from 'lucide-react';

import { useStockMovements } from '../hooks/useStockMovements';

import Pagination from '../components/ui/Pagination';

const LIMIT = 10;

const TYPE_LABELS = {
  in: 'Stock In',
  out: 'Stock Out',
  adjustment: 'Adjustment',
};

const TYPE_STYLES = {
  in: 'bg-emerald-100 text-emerald-700',
  out: 'bg-red-100 text-red-700',
  adjustment:
    'bg-amber-100 text-amber-700',
};

const TypeBadge = ({
  type,
}) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
      TYPE_STYLES[type] ||
      'bg-slate-100 text-slate-600'
    }`}
  >
    {type === 'in' ? (
      <ArrowDownToLine size={13} />
    ) : type === 'out' ? (
      <ArrowUpFromLine size={13} />
    ) : (
      <ClipboardEdit size={13} />
    )}

    {TYPE_LABELS[type] ||
      type}
  </span>
);

const StockMovements = () => {
  const [page, setPage] =
    useState(1);

  const [search, setSearch] =
    useState('');

  const [type, setType] =
    useState('');

  const params = useMemo(
    () => ({
      page,
      limit: LIMIT,

      ...(search
        ? { search }
        : {}),

      ...(type
        ? { type }
        : {}),
    }),
    [page, search, type]
  );

  const {
    data,
    isLoading,
    isError,
    error,
  } =
    useStockMovements(
      params
    );

  const movements =
    data?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Stock Movement History
        </h2>

        <p className="text-sm text-slate-500">
          Track every stock-in,
          stock-out, and
          adjustment.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(e) => {
                setSearch(
                  e.target.value
                );

                setPage(1);
              }}
              placeholder="Search by product, SKU, or barcode..."
              className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm"
            />
          </div>

          <select
            value={type}
            onChange={(e) => {
              setType(
                e.target.value
              );

              setPage(1);
            }}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:w-44"
          >
            <option value="">
              All types
            </option>

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

        {isLoading ? (
          <div className="flex justify-center py-16 text-sm text-slate-400">
            Loading movement
            history...
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <AlertCircle
              size={28}
              className="text-red-400"
            />

            <p className="text-sm font-medium text-slate-700">
              Couldn&apos;t load
              movement history
            </p>

            <p className="text-xs text-slate-500">
              {error?.response
                ?.data?.message ||
                'Something went wrong.'}
            </p>
          </div>
        ) : movements.length ===
          0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <History
              size={28}
              className="text-slate-300"
            />

            <p className="text-sm font-medium text-slate-700">
              No stock movements
              yet
            </p>

            <p className="text-xs text-slate-500">
              Stock changes will
              appear here after
              you record them.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">
                    Date
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Product
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Type
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Change
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Previous
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Resulting
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Unit Cost
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Reason
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {movements.map(
                  (movement) => (
                    <tr
                      key={
                        movement._id
                      }
                      className="hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                        {new Date(
                          movement.createdAt
                        ).toLocaleString()}
                      </td>

                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">
                          {
                            movement
                              .productId
                              ?.name
                          }
                        </p>

                        <p className="text-xs text-slate-400">
                          {
                            movement
                              .productId
                              ?.sku
                          }
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        <TypeBadge
                          type={
                            movement.type
                          }
                        />
                      </td>

                      <td
                        className={`px-4 py-3 font-semibold ${
                          movement.quantityChange >
                          0
                            ? 'text-emerald-600'
                            : 'text-red-600'
                        }`}
                      >
                        {movement.quantityChange >
                        0
                          ? '+'
                          : ''}

                        {
                          movement.quantityChange
                        }
                      </td>

                      <td className="px-4 py-3 text-slate-500">
                        {
                          movement.previousStock
                        }
                      </td>

                      <td className="px-4 py-3 font-medium text-slate-700">
                        {
                          movement.resultingStock
                        }
                      </td>

                      <td className="px-4 py-3 text-slate-500">
                        {movement.unitCost ==
                        null
                          ? '—'
                          : `৳${Number(
                              movement.unitCost
                            ).toFixed(
                              2
                            )}`}
                      </td>

                      <td className="max-w-xs truncate px-4 py-3 text-slate-500">
                        {movement.reason ||
                          '—'}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading &&
          !isError &&
          movements.length >
            0 && (
            <Pagination
              page={page}
              pages={
                data?.totalPages ||
                1
              }
              total={
                data?.totalItems ||
                0
              }
              limit={LIMIT}
              onPageChange={
                setPage
              }
            />
          )}
      </div>
    </div>
  );
};

export default StockMovements;