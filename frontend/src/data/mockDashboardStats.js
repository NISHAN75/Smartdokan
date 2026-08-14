// TEMPORARY MOCK DATA
// Replace each value here with a real API call once the
// Sales / Inventory / Purchases modules exist. Keeping this in one
// file means swapping to live data later only touches this file.

export const mockSummaryStats = [
  {
    id: 'todaysSales',
    label: "Today's Sales",
    value: '৳ 24,500',
    trend: '+12%',
    trendDirection: 'up',
  },
  {
    id: 'todaysPurchase',
    label: "Today's Purchase",
    value: '৳ 9,200',
    trend: '+4%',
    trendDirection: 'up',
  },
  {
    id: 'todaysProfit',
    label: "Today's Profit",
    value: '৳ 15,300',
    trend: '+18%',
    trendDirection: 'up',
  },
  {
    id: 'totalProducts',
    label: 'Total Products',
    value: '1,284',
    trend: '+6 new',
    trendDirection: 'neutral',
  },
  {
    id: 'lowStockItems',
    label: 'Low Stock Items',
    value: '17',
    trend: 'Needs attention',
    trendDirection: 'down',
  },
  {
    id: 'customerDue',
    label: 'Customer Due',
    value: '৳ 6,800',
    trend: '23 customers',
    trendDirection: 'neutral',
  },
  {
    id: 'supplierDue',
    label: 'Supplier Due',
    value: '৳ 11,450',
    trend: '5 suppliers',
    trendDirection: 'neutral',
  },
  {
    id: 'todaysExpenses',
    label: "Today's Expenses",
    value: '৳ 2,150',
    trend: '-3%',
    trendDirection: 'down',
  },
];
