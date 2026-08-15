import { useEffect, useState } from 'react';
import {
  User,
  Store,
  ReceiptText,
  ShieldCheck,
  Save,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import useAuth from '../hooks/useAuth';
import {
  useSettings,
  useUpdateProfile,
  useUpdatePassword,
  useUpdateBusinessSettings,
} from '../hooks/useSettings';

const Section = ({ icon: Icon, title, description, children }) => (
  <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
    <div className="border-b border-slate-100 px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="rounded-md bg-amber-50 p-2 text-amber-600">
          <Icon size={18} />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        </div>
      </div>
    </div>
    <div className="p-5">{children}</div>
  </section>
);

const Field = ({ label, ...props }) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-medium text-slate-600">{label}</span>
    <input
      {...props}
      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
    />
  </label>
);

const SelectField = ({ label, children, ...props }) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-medium text-slate-600">{label}</span>
    <select
      {...props}
      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
    >
      {children}
    </select>
  </label>
);

const SaveButton = ({ loading }) => (
  <button
    type="submit"
    disabled={loading}
    className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
  >
    {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
    {loading ? 'Saving...' : 'Save Changes'}
  </button>
);

const Settings = () => {
  const { user } = useAuth();
  const { data, isLoading, isError, error } = useSettings();
  const updateProfile = useUpdateProfile();
  const updatePassword = useUpdatePassword();
  const updateBusiness = useUpdateBusinessSettings();

  const [profile, setProfile] = useState({ name: '', email: '' });
  const [business, setBusiness] = useState({
    shopName: 'SmartDokan',
    shopPhone: '',
    shopEmail: '',
    shopAddress: '',
    logoUrl: '',
    invoicePrefix: 'INV',
    currency: 'BDT',
    timezone: 'Asia/Dhaka',
    dateFormat: 'DD/MM/YYYY',
    defaultPaymentMethod: 'cash',
    taxRate: 0,
    defaultDiscount: 0,
    lowStockThreshold: 5,
    invoiceFooter: 'Thank you for your business.',
  });
  const [password, setPassword] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (data) {
      setProfile({ name: data.profile?.name || '', email: data.profile?.email || '' });
      setBusiness((prev) => ({ ...prev, ...(data.business || {}) }));
    }
  }, [data]);

  const showSuccess = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3000);
  };

  const errorMessage = (err) =>
    err?.response?.data?.message || err?.message || 'Something went wrong';

  const submitProfile = async (e) => {
    e.preventDefault();
    try {
      await updateProfile.mutateAsync(profile);
      showSuccess('Profile updated successfully.');
    } catch (err) {
      showSuccess(`Error: ${errorMessage(err)}`);
    }
  };

  const submitBusiness = async (e) => {
    e.preventDefault();
    try {
      await updateBusiness.mutateAsync({
        ...business,
        taxRate: Number(business.taxRate),
        defaultDiscount: Number(business.defaultDiscount),
        lowStockThreshold: Number(business.lowStockThreshold),
      });
      showSuccess('Business settings updated successfully.');
    } catch (err) {
      showSuccess(`Error: ${errorMessage(err)}`);
    }
  };

  const submitPassword = async (e) => {
    e.preventDefault();
    try {
      await updatePassword.mutateAsync(password);
      setPassword({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showSuccess('Password changed successfully.');
    } catch (err) {
      showSuccess(`Error: ${errorMessage(err)}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center text-slate-500">
        <Loader2 className="mr-2 animate-spin" size={20} /> Loading settings...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        {errorMessage(error)}
      </div>
    );
  }

  const setB = (key) => (e) => setBusiness((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your profile, shop information, invoices, POS defaults and security.
        </p>
      </div>

      {notice && (
        <div className={`flex items-center gap-2 rounded-md border px-4 py-3 text-sm ${
          notice.startsWith('Error:')
            ? 'border-red-200 bg-red-50 text-red-700'
            : 'border-emerald-200 bg-emerald-50 text-emerald-700'
        }`}>
          <CheckCircle2 size={17} />
          {notice}
        </div>
      )}

      <Section icon={User} title="Profile" description="Update the account currently signed in.">
        <form onSubmit={submitProfile} className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Name"
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            required
          />
          <Field
            label="Email"
            type="email"
            value={profile.email}
            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
            required
          />
          <div className="sm:col-span-2 flex items-center justify-between">
            <p className="text-xs text-slate-500">Role: <span className="font-medium">{user?.role || data?.profile?.role}</span></p>
            <SaveButton loading={updateProfile.isPending} />
          </div>
        </form>
      </Section>

      <Section icon={Store} title="Shop / Business" description="Information used throughout the shop and invoices.">
        <form onSubmit={submitBusiness} className="grid gap-4 sm:grid-cols-2">
          <Field label="Shop Name" value={business.shopName} onChange={setB('shopName')} required />
          <Field label="Shop Phone" value={business.shopPhone} onChange={setB('shopPhone')} />
          <Field label="Shop Email" type="email" value={business.shopEmail} onChange={setB('shopEmail')} />
          <Field label="Logo URL" value={business.logoUrl} onChange={setB('logoUrl')} placeholder="https://..." />
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-medium text-slate-600">Address</span>
            <textarea
              value={business.shopAddress}
              onChange={setB('shopAddress')}
              rows={2}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
            />
          </label>
          <div className="sm:col-span-2 flex justify-end">
            <SaveButton loading={updateBusiness.isPending} />
          </div>
        </form>
      </Section>

      <Section icon={ReceiptText} title="Invoice & POS" description="Default invoice and payment behaviour for this account.">
        <form onSubmit={submitBusiness} className="grid gap-4 sm:grid-cols-2">
          <Field label="Invoice Prefix" value={business.invoicePrefix} onChange={setB('invoicePrefix')} />
          <SelectField label="Default Payment Method" value={business.defaultPaymentMethod} onChange={setB('defaultPaymentMethod')}>
            <option value="cash">Cash</option>
            <option value="bkash">bKash</option>
            <option value="card">Card</option>
            <option value="other">Other</option>
          </SelectField>
          <SelectField label="Currency" value={business.currency} onChange={setB('currency')}>
            <option value="BDT">BDT (৳)</option>
          </SelectField>
          <SelectField label="Date Format" value={business.dateFormat} onChange={setB('dateFormat')}>
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          </SelectField>
          <SelectField label="Timezone" value={business.timezone} onChange={setB('timezone')}>
            <option value="Asia/Dhaka">Asia/Dhaka</option>
          </SelectField>
          <Field label="Default Tax %" type="number" min="0" max="100" step="0.01" value={business.taxRate} onChange={setB('taxRate')} />
          <Field label="Default Discount %" type="number" min="0" max="100" step="0.01" value={business.defaultDiscount} onChange={setB('defaultDiscount')} />
          <Field label="Low Stock Threshold" type="number" min="0" step="1" value={business.lowStockThreshold} onChange={setB('lowStockThreshold')} />
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-medium text-slate-600">Invoice Footer</span>
            <textarea value={business.invoiceFooter} onChange={setB('invoiceFooter')} rows={2} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
          </label>
          <div className="sm:col-span-2 flex justify-end">
            <SaveButton loading={updateBusiness.isPending} />
          </div>
        </form>
      </Section>

      <Section icon={ShieldCheck} title="Security" description="Change the password for your SmartDokan account.">
        <form onSubmit={submitPassword} className="max-w-xl space-y-4">
          <Field label="Current Password" type="password" value={password.currentPassword} onChange={(e) => setPassword({ ...password, currentPassword: e.target.value })} required />
          <Field label="New Password" type="password" minLength={6} value={password.newPassword} onChange={(e) => setPassword({ ...password, newPassword: e.target.value })} required />
          <Field label="Confirm New Password" type="password" minLength={6} value={password.confirmPassword} onChange={(e) => setPassword({ ...password, confirmPassword: e.target.value })} required />
          <div className="flex justify-end">
            <SaveButton loading={updatePassword.isPending} />
          </div>
        </form>
      </Section>
    </div>
  );
};

export default Settings;
