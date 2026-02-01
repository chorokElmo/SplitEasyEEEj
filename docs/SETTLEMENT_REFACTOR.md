# Settlement feature – refactor summary

## Backend as single source of truth

- **Backend settlement status is the only source of truth.** The React UI never guesses; it only shows what the API returns.
- **Button visibility is derived only from `settlement.status`:**  
  `unpaid` → Pay button | `partial` → Continue payment | `paid` → “Paid ✓” (no button).
- After any payment, the UI **re-fetches** settlements from the backend; there is **no optimistic UI** that could allow double payment.

---

## API

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/groups/:id/settlements` | List settlements for a group. Returns `id`, `groupId`, `payerId`, `receiverId`, `totalAmount`, `paidAmount`, `status` (`unpaid` \| `partial` \| `paid`). |
| POST | `/api/settlements/:id/pay` | Record a payment (full or partial). Body: `{ amount?: number }` (optional; omit to pay full remaining). |
| POST | `/api/settlements/:id/undo` | Undo the last payment for a settlement (transactional). |

---

## Backend settlement flow

1. **GET /groups/:id/settlements**  
   Loads all settlements for the group, normalizes status to `unpaid` | `partial` | `paid`, and returns `payerId`/`receiverId`/`paidAmount` (and related fields) so the UI never has to infer them.

2. **POST /settlements/:id/pay**  
   - If settlement is already `paid` → **409** (duplicate payment rejected).  
   - If `amount` would exceed remaining → **400** (over-payment rejected).  
   - In a **single transaction**: create a `Payment` document, update settlement `totalPaid` and `remainingAmount`, set `status` to `partial` or `paid` when `paidAmount === totalAmount`.  
   - No double payment: the update is conditional on current `remainingAmount` and `status !== 'paid'`.

3. **One active settlement per (group, payer, receiver)**  
   Unique partial index on `(groupId, fromUserId, toUserId)` where `status in ['pending','partial']` prevents duplicate active settlements for the same pair.

4. **POST /settlements/:id/undo**  
   In a transaction: find last `Payment` for the settlement, delete it, decrement `totalPaid`, increment `remainingAmount`, recompute `status`.

---

## How double payments are prevented

1. **Server-side:**  
   - Before applying a payment, the backend checks `status !== 'paid'` and (for partial) `amount <= remainingAmount`.  
   - The update uses a **conditional** write (e.g. `status: { $ne: 'paid' }`, `remainingAmount: { $gte: amount }`). If another request already marked the settlement paid or reduced remaining, the update matches zero documents and the handler returns 400/409.

2. **No optimistic UI:**  
   The React app does not clear the Pay button or move the card to “Completed” before the server responds. It waits for success, then **re-fetches** `GET /groups/:id/settlements`. Buttons and sections are driven only by the new `settlement.status`.

3. **Single source of truth:**  
   All “can I pay?” and “is it paid?” decisions come from the settlement document returned by the API. The UI never keeps its own “paid” state that could get out of sync.

---

## React: SettlementCard and sections

- **SettlementCard**  
  One card per settlement. It receives `settlement` (with `status`, `totalAmount`, `paidAmount`, `payerId`, `receiverId`, and populated user names).  
  - **unpaid** → Show “Pay [name] [amount]” or “Get [amount] from [name]” and a Pay button.  
  - **partial** → Same label, button text: “Continue payment”.  
  - **paid** → Show “Paid ✓” only; no button.

- **Sections (from backend list):**  
  - **To pay:** settlements where `status !== 'paid'` and current user is `payerId`.  
  - **To receive:** settlements where `status !== 'paid'` and current user is `receiverId`.  
  - **Completed:** settlements where `status === 'paid'`.

- **After confirming payment:**  
  Call `POST /settlements/:id/pay`, then on success invalidate and refetch `groupSettlements` (and balances). The card moves to Completed and the button disappears only after the new data is loaded.

---

## Settlement model (backend)

Relevant fields: `id`, `groupId`, `payerId` (fromUserId), `receiverId` (toUserId), `totalAmount`, `paidAmount` (totalPaid), `status` (`unpaid` | `partial` | `paid`).  
Business rules: `paidAmount === totalAmount` → `status = paid`; partial payments only increase `paidAmount` within remaining; duplicate and over-payments are rejected; settlement writes are transactional where applicable.
