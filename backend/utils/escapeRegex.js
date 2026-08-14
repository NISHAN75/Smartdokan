/**
 * Escapes regex special characters in user-supplied input before it's
 * used to build a MongoDB $regex filter (e.g. for search-by-text).
 * Without this, characters like '.', '*', '(' in a search term would be
 * interpreted as regex syntax instead of literal text, and could be used
 * to craft expensive/pathological patterns.
 */
const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export default escapeRegex;
