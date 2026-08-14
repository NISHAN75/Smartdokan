import escapeRegex from './escapeRegex.js';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

/**
 * Builds a reusable { filter, sort, page, limit, skip } shape from a
 * base scope filter (e.g. { companyId }) plus a request's query string.
 *
 * This is intentionally generic so every future list endpoint (Products,
 * Customers, Suppliers, ...) can follow the same ?page=&limit=&search=
 * &status=&sort= contract instead of each module reinventing pagination.
 *
 * Usage:
 *   const { filter, sort, page, limit, skip } = new ApiFeatures(
 *     { companyId },
 *     req.query
 *   )
 *     .search(['name', 'description'])
 *     .applyFilters(['status'])
 *     .build();
 *
 *   const [docs, total] = await Promise.all([
 *     Model.find(filter).sort(sort).skip(skip).limit(limit),
 *     Model.countDocuments(filter),
 *   ]);
 */
class ApiFeatures {
  constructor(baseFilter = {}, queryString = {}) {
    this.filter = { ...baseFilter };
    this.queryString = queryString;
  }

  /**
   * Adds a case-insensitive $or search across the given fields, using
   * the `search` query param. No-op if `search` wasn't provided.
   */
  search(fields = []) {
    const term = this.queryString.search?.trim();
    if (term && fields.length) {
      const regex = new RegExp(escapeRegex(term), 'i');
      this.filter.$or = fields.map((field) => ({ [field]: regex }));
    }
    return this;
  }

  /**
   * Applies exact-match filters for each allowed query param that is
   * present on the request (e.g. `status`). Only params explicitly
   * whitelisted by the caller are applied, so unrelated query params
   * can never leak into the Mongo filter.
   */
  applyFilters(allowedFields = []) {
    allowedFields.forEach((field) => {
      const value = this.queryString[field];
      if (value !== undefined && value !== '') {
        this.filter[field] = value;
      }
    });
    return this;
  }

  build() {
    const page = Math.max(parseInt(this.queryString.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(this.queryString.limit, 10) || DEFAULT_LIMIT, 1),
      MAX_LIMIT
    );
    const skip = (page - 1) * limit;
    const sort = this.queryString.sort
      ? this.queryString.sort.split(',').join(' ')
      : '-createdAt';

    return { filter: this.filter, sort, page, limit, skip };
  }
}

export default ApiFeatures;
