export const applyDateRangeFilter = (match, field, from, to) => {
  const range = {};
  if (from) { const d = new Date(from); if (!Number.isNaN(d.getTime())) range.$gte = d; }
  if (to) { const d = new Date(to); if (!Number.isNaN(d.getTime())) { d.setHours(23,59,59,999); range.$lte = d; } }
  if (Object.keys(range).length) match[field] = range;
  return match;
};

export const getDateRange = (req) => ({ from: req.query.from, to: req.query.to });
