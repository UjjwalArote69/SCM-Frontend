/**
 * Shared cache + concurrency guard for Zustand "list store" fetchAll actions.
 *
 * Most pages in this app run `useEffect(() => fetchAll(), [fetchAll])` on
 * mount. Without a guard that means:
 *   - Navigating list → detail → list refetches identical data.
 *   - Two components on the same screen (e.g. AdminHome's 10 parallel
 *     dashboards) fire concurrent identical requests.
 *
 * makeListFetcher wraps a fetcher with:
 *   - TTL skip: if the last successful fetch is younger than `ttlMs` and
 *     there's at least one row cached, return the cache and do nothing.
 *   - Dedup: if a request is already in flight, return that promise instead
 *     of starting a new one.
 *   - Force override: pass `true` (or `{ force: true }`) to bypass both
 *     guards. RefreshButton always passes `true` so user-initiated refreshes
 *     are honoured.
 *
 * Convention: stores keep their existing `items`, `loading`, `error` shape
 * and additionally hold `lastFetchedAt` (ms) and `_inflight` (Promise|null).
 * Mutations (create/update/remove) should keep mutating `items` directly so
 * the cache stays consistent without needing a refetch.
 */

const DEFAULT_TTL_MS = 30_000;

export function makeListFetcher({
  get,
  set,
  fetcher,
  key = "items",
  ttlMs = DEFAULT_TTL_MS,
  errorLabel = "Failed to load",
}) {
  return async function fetchAll(force = false) {
    const isForce = force === true || (force && force.force === true);
    const state = get();

    // Skip if cached and not forced
    if (
      !isForce
      && state.lastFetchedAt
      && Date.now() - state.lastFetchedAt < ttlMs
      && Array.isArray(state[key])
      && state[key].length > 0
    ) {
      return state[key];
    }

    // Dedup: piggy-back on the in-flight request if one exists
    if (state._inflight) return state._inflight;

    const promise = (async () => {
      set({ loading: true, error: null });
      try {
        const result = await fetcher();
        const items = Array.isArray(result?.data) ? result.data
          : Array.isArray(result) ? result
          : [];
        set({
          [key]: items,
          loading: false,
          lastFetchedAt: Date.now(),
          _inflight: null,
        });
        return items;
      } catch (err) {
        // Surface the error in the store but DON'T rethrow — almost every
        // caller is `useEffect(() => fetchAll(), [])` without a .catch, so
        // a thrown 401/network-error would become an unhandled promise
        // rejection in the console. Callers that genuinely care can read
        // `store.error` after awaiting.
        set({
          loading: false,
          error: err?.response?.data?.message ?? err?.message ?? errorLabel,
          _inflight: null,
        });
        return get()[key] ?? [];
      }
    })();

    set({ _inflight: promise });
    return promise;
  };
}

/**
 * Single-record TTL guard for "show" calls. Same pattern but stores results
 * keyed by id in a Map rather than a single array. Optional — only the
 * heavily-visited detail pages need this.
 */
export function makeRecordFetcher({
  get,
  set,
  fetcher,           // (id) => Promise<record>
  cacheKey = "_byId",
  inflightKey = "_inflightById",
  ttlMs = DEFAULT_TTL_MS,
  errorLabel = "Failed to load",
}) {
  return async function fetchById(id, force = false) {
    const isForce = force === true || (force && force.force === true);
    const state = get();
    const byId = state[cacheKey] instanceof Map ? state[cacheKey] : new Map();
    const inflight = state[inflightKey] instanceof Map ? state[inflightKey] : new Map();

    const cached = byId.get(id);
    if (
      !isForce
      && cached
      && cached.fetchedAt
      && Date.now() - cached.fetchedAt < ttlMs
    ) {
      return cached.record;
    }
    if (inflight.has(id)) return inflight.get(id);

    const promise = (async () => {
      try {
        const record = await fetcher(id);
        const nextById = new Map(byId);
        nextById.set(id, { record, fetchedAt: Date.now() });
        const nextInflight = new Map(inflight);
        nextInflight.delete(id);
        set({ [cacheKey]: nextById, [inflightKey]: nextInflight });
        return record;
      } catch (err) {
        const nextInflight = new Map(inflight);
        nextInflight.delete(id);
        set({ [inflightKey]: nextInflight, error: err?.message ?? errorLabel });
        throw err;
      }
    })();

    const nextInflight = new Map(inflight);
    nextInflight.set(id, promise);
    set({ [inflightKey]: nextInflight });
    return promise;
  };
}
