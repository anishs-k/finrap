const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

export function parsePagination(query = {}, options = {}) {
  const page = normalizePositiveInteger(query.page, DEFAULT_PAGE);
  const limit = Math.min(
    normalizePositiveInteger(query.limit, options.defaultLimit || DEFAULT_LIMIT),
    options.maxLimit || MAX_LIMIT
  );
  const enabled = query.page !== undefined || query.limit !== undefined || query.paged === "true";

  return {
    enabled,
    page,
    limit,
    skip: (page - 1) * limit
  };
}

export async function runPaginatedQuery({ query, countQuery, pagination, mapper }) {
  const itemsQuery = pagination.enabled ? query.skip(pagination.skip).limit(pagination.limit) : query;
  const [items, total] = pagination.enabled
    ? await Promise.all([itemsQuery, countQuery])
    : [await itemsQuery, null];
  const mappedItems = mapper ? items.map(mapper) : items;

  if (!pagination.enabled) {
    return mappedItems;
  }

  return {
    items: mappedItems,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / pagination.limit))
    }
  };
}

function normalizePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
