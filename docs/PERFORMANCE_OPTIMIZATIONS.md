# Performance Optimizations Summary

All changes **preserve existing functionality**. Same features, same APIs, same user-visible behavior—only faster load and runtime.

---

## 1. Frontend – Route-based code splitting (App.jsx)

**What:** Page components are now loaded with `React.lazy()` and wrapped in `<Suspense>`.

**Why:** The initial JS bundle no longer includes all pages (Expenses, Analytics, Groups, etc.). Only the current route’s chunk is loaded. This reduces **First Load JS** and **Time to Interactive**.

**Result:** Smaller initial download; each route loads its JS when visited. Loading spinner during route load (same UX as auth loading).

---

## 2. Frontend – Query client tuning (main.jsx)

**What:** Default options for React Query:

- `staleTime: 5 * 60 * 1000` (5 minutes)
- `gcTime: 10 * 60 * 1000` (10 minutes, formerly `cacheTime`)

**Why:** Without `staleTime`, data is refetched on every mount/focus. With 5 min, unchanged data is reused and refetches are reduced. Same data is shown; fewer network calls and less work.

**Result:** Fewer redundant API requests; cached data reused when still fresh.

---

## 3. Frontend – Auth context stability (AuthContext.jsx)

**What:** Context value and callbacks are stabilized:

- `login`, `register`, `logout`, `updateUser` wrapped in `useCallback`
- Context `value` object built with `useMemo` and the same dependencies

**Why:** A new object/callback every render forces all context consumers to re-render. Stable references avoid unnecessary re-renders of Layout, Sidebar, Header, and every protected page.

**Result:** Fewer re-renders when only auth state that didn’t change is “touched”; same behavior and API.

---

## 4. Frontend – Build configuration (vite.config.js)

**What:**

- **Target:** `es2020` for smaller, modern output.
- **manualChunks:** Vendor split into logical chunks (e.g. `react-vendor`, `react-query`, `recharts`, `radix-ui`, `lucide`, `router`, `i18n`, `vendor`).
- **chunkSizeWarningLimit:** `600` to reflect intentional large vendor chunk.

**Why:** Better caching (vendor chunks change less often); parallel loading of chunks; modern syntax reduces size.

**Result:** Better long-term cache reuse and parallel loading; same app behavior.

---

## 5. Frontend – Layout and Sidebar (Layout.jsx, Sidebar.jsx)

**What:**

- **Layout:** Wrapped in `React.memo` so it doesn’t re-render when parent re-renders without prop/Outlet changes.
- **Sidebar:** Navigation array built inside `useMemo` depending on `t` (translation).

**Why:** Layout/Sidebar were re-rendering on every parent update. Memoizing Layout and the nav list avoids unnecessary work and keeps the same UI.

**Result:** Fewer re-renders; same layout and navigation behavior.

---

## 6. Frontend – API base URL from env (lib/api.js)

**What:** `getApiUrl()` uses `import.meta.env.VITE_API_URL` when set (trimmed), with the same hardcoded fallback as before.

**Why:** Production can override the API URL via env without code changes; avoids extra branches and keeps a single source of truth.

**Result:** Same runtime behavior when env is unset; configurable in production without code edits.

---

## 7. Backend – Static file caching (server.js)

**What:** `express.static('uploads', { maxAge: 86400000 })` — 1 day cache for `/uploads`.

**Why:** User-uploaded assets (e.g. avatars) are served with cache headers so repeat visits don’t re-download the same file.

**Result:** Fewer repeat requests for the same static file; no change to API or application logic.

---

## What was not changed

- No feature or flow was removed or altered.
- No API contract, request/response shape, or database behavior was changed.
- No change to user-visible text, validation, or business logic.
- i18n, routing, auth rules, and form behavior are unchanged.

---

## How to verify

1. **Dev:** `npm run dev` in `frontend-react` — app should behave as before; navigation may show a brief spinner when opening a route for the first time (expected with lazy loading).
2. **Build:** `npm run build` in `frontend-react` — should complete successfully; inspect `dist/assets/` for multiple chunks (e.g. page chunks and vendor chunks).
3. **Backend:** Start backend as usual; `/uploads` responses should include `Cache-Control` with `maxAge=86400000` (or equivalent).
