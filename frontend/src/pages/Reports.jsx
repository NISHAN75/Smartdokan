import { useMemo, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import {
  useSalesReport, usePurchasesReport, useExpensesReport, useProfitLossReport,
  useProductsReport, useCustomersReport, useSuppliersReport, useInventoryReport,
} from '../hooks/useReports';
import { Summary, Table, money } from '../components/reports/ReportUI';

const tabs = [
  ['sales','Sales'], ['purchases','Purchases'], ['expenses','Expenses'],
  ['profit-loss','Profit & Loss'], ['products','Products'], ['customers','Customers'],
  ['suppliers','Suppliers'], ['inventory','Inventory'],
];

const downloadCsv = (rows) => {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v) => `"${String(v ?? '').replaceAll('"','""')}"`;
  const body = rows.map(row => headers.map(key => escape(row[key])).join(',')).join('\n');
  const blob = new Blob([[headers.map(escape).join(','), body].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'smartdokan-report.csv'; a.click(); URL.revokeObjectURL(url);
};

const date = (v) => v ? new Date(v).toLocaleDateString() : '—';

const Reports = () => {
  const [tab, setTab] = useState('sales');
  const [from, setFrom] = useState(''); const [to, setTo] = useState(''); const [search, setSearch] = useState('');
  const params = useMemo(() => ({ page: 1, limit: 50, ...(from && { from }), ...(to && { to }), ...(search && { search }) }), [from,to,search]);

  const sales = useSalesReport(params, tab === 'sales');
  const purchases = usePurchasesReport(params, tab === 'purchases');
  const expenses = useExpensesReport(params, tab === 'expenses');
  const profitLoss = useProfitLossReport(params, tab === 'profit-loss');
  const products = useProductsReport(params, tab === 'products');
  const customers = useCustomersReport(params, tab === 'customers');
  const suppliers = useSuppliersReport(params, tab === 'suppliers');
  const inventory = useInventoryReport(params, tab === 'inventory');
  const query = { sales, purchases, expenses, 'profit-loss': profitLoss, products, customers, suppliers, inventory }[tab];
  const response = query.data;
  const rows = response?.data || [];

  const columnSets = {
    sales: [['invoiceNumber','Invoice'],['customerName','Customer'],['total','Total',r=>money(r.total)],['paidAmount','Paid',r=>money(r.paidAmount)],['dueAmount','Due',r=>money(r.dueAmount)],['paymentStatus','Status'],['createdAt','Date',r=>date(r.createdAt)]],
    purchases: [['purchaseNumber','Purchase'],['supplierName','Supplier'],['total','Total',r=>money(r.total)],['paidAmount','Paid',r=>money(r.paidAmount)],['dueAmount','Due',r=>money(r.dueAmount)],['paymentStatus','Status'],['createdAt','Date',r=>date(r.createdAt)]],
    expenses: [['categoryName','Category'],['amount','Amount',r=>money(r.amount)],['paymentMethod','Method'],['reference','Reference'],['expenseDate','Date',r=>date(r.expenseDate)]],
    products: [['name','Product'],['sku','SKU'],['purchasePrice','Purchase',r=>money(r.purchasePrice)],['sellingPrice','Selling',r=>money(r.sellingPrice)],['minimumStock','Minimum'],['status','Status']],
    customers: [['name','Name'],['phone','Phone'],['email','Email'],['createdAt','Created',r=>date(r.createdAt)]],
    suppliers: [['name','Name'],['phone','Phone'],['email','Email'],['status','Status']],
    inventory: [['name','Product'],['sku','SKU'],['openingStock','Opening'],['currentStock','Current'],['minimumStock','Minimum'],['unit','Unit']],
  };
  const columns = (columnSets[tab] || []).map(([key,label,render]) => ({key,label,render}));
  const pl = tab === 'profit-loss' ? response?.data : null;
  const summary = response?.summary;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-xl font-semibold text-slate-900">Reports</h2><p className="text-sm text-slate-500">Business performance, finance and inventory reports.</p></div>
        <button onClick={() => downloadCsv(rows)} className="flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white"><Download size={16}/>Export CSV</button>
      </div>
      <div className="flex gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-white p-1">
        {tabs.map(([id,label]) => <button key={id} onClick={() => setTab(id)} className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ${tab===id ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{label}</button>)}
      </div>
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row">
        <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm"/>
        <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm"/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"/>
        <button onClick={()=>{setFrom('');setTo('');setSearch('')}} className="flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm"><RefreshCw size={15}/>Reset</button>
      </div>
      {pl && <Summary items={[{label:'Revenue',value:money(pl.revenue)},{label:'Gross Profit',value:money(pl.grossProfit)},{label:'Expenses',value:money(pl.expenses)},{label:'Net Profit',value:money(pl.netProfit)}]}/>} 
      {!pl && summary && <Summary items={[
        {label:tab==='sales'?'Sales':tab==='purchases'?'Purchases':'Expenses',value:summary.count},
        {label:'Total',value:money(summary.total)},
        ...(tab==='expenses'?[]:[{label:'Paid',value:money(summary.paid)},{label:'Due',value:money(summary.due)}]),
      ]}/>} 
      {query.isLoading && <div className="rounded-lg bg-white p-10 text-center text-slate-500">Loading report...</div>}
      {query.isError && <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{query.error?.response?.data?.message || 'Failed to load report.'}</div>}
      {!query.isLoading && !query.isError && tab !== 'profit-loss' && <Table columns={columns} rows={rows}/>} 
      {pl && <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">Profit/Loss currently uses purchase totals as the cost basis because the existing Sale item schema does not store a historical cost-price snapshot.</div>}
    </div>
  );
};
export default Reports;
