import { useMemo, useState } from 'react';
import { Plus, Search, Pencil, Power, Users as UsersIcon, ShieldCheck, UserCog } from 'lucide-react';
import { useUsers, useCreateUser, useUpdateUser } from '../hooks/useUsers';
import useAuth from '../hooks/useAuth';
import UserFormModal from '../components/users/UserFormModal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import StatusBadge from '../components/ui/StatusBadge';
import Pagination from '../components/ui/Pagination';
import Toast from '../components/ui/Toast';

const LIMIT = 10;

const ROLE_STYLES = {
  admin: 'bg-indigo-100 text-indigo-700',
  manager: 'bg-amber-100 text-amber-700',
  staff: 'bg-slate-100 text-slate-600',
};

const RoleBadge = ({ role }) => (
  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${ROLE_STYLES[role] || 'bg-slate-100 text-slate-600'}`}>
    {role}
  </span>
);

const SummaryCard = ({ icon: Icon, label, value, tone = 'slate' }) => {
  const toneStyles = {
    slate: 'bg-slate-100 text-slate-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    indigo: 'bg-indigo-100 text-indigo-600',
    amber: 'bg-amber-100 text-amber-600',
  };
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${toneStyles[tone]}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs text-slate-500">{label}</p>
        <p className="text-lg font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  );
};

const Users = () => {
  const { user: currentUser } = useAuth();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [togglingUser, setTogglingUser] = useState(null);
  const [toast, setToast] = useState(null);

  const params = useMemo(
    () => ({
      page,
      limit: LIMIT,
      ...(search ? { search } : {}),
      ...(role ? { role } : {}),
    }),
    [page, search, role]
  );

  const { data, isLoading, isError, error } = useUsers(params);
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const users = data?.data || [];
  const total = data?.totalItems || 0;
  const pages = data?.totalPages || 1;
  const hasActiveFilters = Boolean(search || role);

  const showToast = (type, message) => setToast({ type, message });

  const resetFiltersAndPage = () => setPage(1);

  const openCreateForm = () => {
    setEditingUser(null);
    setFormOpen(true);
  };

  const openEditForm = (user) => {
    setEditingUser(user);
    setFormOpen(true);
  };

  const handleFormSubmit = async (payload) => {
    if (editingUser) {
      await updateUser.mutateAsync({ id: editingUser.id, ...payload });
      showToast('success', 'User updated successfully');
    } else {
      await createUser.mutateAsync(payload);
      showToast('success', 'User created successfully');
    }
    setFormOpen(false);
    setEditingUser(null);
  };

  const handleToggleStatus = async () => {
    if (!togglingUser) return;
    try {
      await updateUser.mutateAsync({ id: togglingUser.id, isActive: !togglingUser.isActive });
      showToast('success', togglingUser.isActive ? 'User deactivated' : 'User activated');
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Could not update this user');
    } finally {
      setTogglingUser(null);
    }
  };

  const activeCount = users.filter((u) => u.isActive).length;
  const adminCount = users.filter((u) => u.role === 'admin').length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">User Management</h1>
        <p className="text-sm text-slate-500">Create staff and manager accounts, and control who can access SmartDokan.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard icon={UsersIcon} label="Total Users (this page)" value={total} tone="slate" />
        <SummaryCard icon={ShieldCheck} label="Admins (this page)" value={adminCount} tone="indigo" />
        <SummaryCard icon={UserCog} label="Active (this page)" value={activeCount} tone="emerald" />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:max-w-xs">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  resetFiltersAndPage();
                }}
                placeholder="Search by name or email..."
                className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                resetFiltersAndPage();
              }}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:w-40"
            >
              <option value="">All roles</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="staff">Staff</option>
            </select>
          </div>

          <button
            type="button"
            onClick={openCreateForm}
            className="flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
          >
            <Plus size={16} />
            Add User
          </button>
        </div>

        {isLoading && <div className="p-16 text-center text-sm text-slate-400">Loading users...</div>}

        {isError && (
          <div className="p-16 text-center text-sm text-red-500">
            {error?.response?.data?.message || 'Could not load users. Please try again.'}
          </div>
        )}

        {!isLoading && !isError && users.length === 0 && (
          <div className="p-16 text-center">
            <p className="text-sm font-medium text-slate-700">
              {hasActiveFilters ? 'No users match your filters' : 'No users yet'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {hasActiveFilters ? 'Try clearing your search or role filter.' : 'Add your first staff or manager account above.'}
            </p>
          </div>
        )}

        {!isLoading && !isError && users.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {u.name}
                      {u.id === currentUser?.id && <span className="ml-2 text-xs font-normal text-slate-400">(you)</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={u.isActive ? 'active' : 'inactive'} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditForm(u)}
                          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
                          title="Edit user"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setTogglingUser(u)}
                          className={`rounded-md p-1.5 hover:bg-slate-100 ${u.isActive ? 'text-slate-500 hover:text-red-600' : 'text-slate-500 hover:text-emerald-600'}`}
                          title={u.isActive ? 'Deactivate user' : 'Activate user'}
                        >
                          <Power size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && !isError && users.length > 0 && (
          <Pagination page={page} pages={pages} total={total} limit={LIMIT} onPageChange={setPage} />
        )}
      </div>

      <UserFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingUser(null);
        }}
        onSubmit={handleFormSubmit}
        initialData={editingUser}
        isSubmitting={createUser.isPending || updateUser.isPending}
        currentUserId={currentUser?.id}
      />

      <ConfirmDialog
        open={Boolean(togglingUser)}
        title={togglingUser?.isActive ? 'Deactivate User' : 'Activate User'}
        message={
          togglingUser?.isActive
            ? `Are you sure you want to deactivate ${togglingUser?.name}? They will no longer be able to log in.`
            : `Are you sure you want to activate ${togglingUser?.name}?`
        }
        confirmLabel={togglingUser?.isActive ? 'Deactivate' : 'Activate'}
        loadingLabel="Saving..."
        onConfirm={handleToggleStatus}
        onCancel={() => setTogglingUser(null)}
        loading={updateUser.isPending}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
};

export default Users;
