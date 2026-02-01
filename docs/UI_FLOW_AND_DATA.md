# SplitEasy – UI Flow and Data (Fixed)

**Stack:** React, Node.js + Express, MongoDB (Mongoose)

---

## Main idea (must match exactly)

- Users go out in groups and add **many expenses** inside a group.
- At the **end**, the app shows a **“Settle up” screen BY GROUP**.
- **Payments happen only at the end.** Payments can be **full** or **partial**. Once everything is paid → group is settled.

---

## UI flow (from the sketch – do not change)

### 1. Settle up – by group (main screen)

- Show list of **all groups**.
- Each group shows:
  - **Group name**
  - **Net amount:** `+$$$` → user should receive, `-$$$` → user owes

**Example:**

| Group         | Net    |
|---------------|--------|
| Apartment     | -120$  |
| Trip Paris    | +80$   |

---

### 2. Click a group → group settlement screen

**Top section:**

- Group name
- Net summary: **“You owe 120$”** OR **“You are owed 80$”**

**Middle section:**

- List of **people involved in settlement**, each person shown separately.

**Example:**

- Pay User 1 → 40$
- Pay User 2 → 50$

---

### 3. Payment actions (very important)

For **each person**:

- **Button:** “Pay”
- **Input:** amount

Also:

- **Button:** “Pay all”

User can:

- Pay full amount
- Or pay part of it
- Or pay multiple people separately

---

## Calculation logic (non-negotiable)

**Rule 1:** Expenses are the **only** thing used to calculate balances.

**Rule 2:** For each user in the group:

- `totalPaid` = sum(expenses paid by user)
- `fairShare` = sum(expense splits for user)
- `netBalance` = totalPaid - fairShare

**Rule 3:** Payments **do not** affect expense calculation. Payments **only** reduce what is owed (settlement `remainingAmount`).

---

## Backend calculation functions

### Step 1 — Balance calculation (expenses only)

**Location:** `backend/models/Split.js`

- **`Split.calculateUserBalance(userId, groupId)`**
  - `totalPaid` = sum of `expense.amount` where `expense.groupId = groupId` and `expense.payerId = userId`
  - `totalOwed` = sum of `split.shareAmount` where `split.userId = userId` and the split’s expense belongs to the group
  - `balance` = totalPaid - totalOwed
  - Returns `{ totalPaid, totalOwed, balance }`. **Computed every time; never stored or cached.**

- **`Split.getGroupBalances(groupId)`**
  - For each group member, calls `calculateUserBalance(member.userId, groupId)`.
  - Returns array of `{ userId, user, totalPaid, totalOwed, balance }`.
  - **Uses only Expense and Split;** no Settlement or Payment.

---

## Settlement logic (must match UI)

From net balances:

- `netBalance < 0` → user **owes** money (debtor)
- `netBalance > 0` → user **receives** money (creditor)

**Settlement shape:**

```text
Settlement {
  groupId
  fromUserId   // debtor
  toUserId     // creditor
  totalAmount
  remainingAmount
}
```

**Example:**

- User A: -90  
- User B: +40  
- User C: +50  

**Settlements:**

- A → B : 40  
- A → C : 50  

### Settlement creation

**Location:** `backend/utils/debtOptimization.js`, `backend/controllers/groupController.js`

- **`computeOptimizedSettlements(balances)`**  
  - Input: array of `{ userId, balance }` from Step 1 (expense-only).  
  - Separates debtors (balance < 0) and creditors (balance > 0).  
  - Greedy two-pointer: match debtor with creditor, amount = min(debtor remaining, creditor remaining).  
  - Returns array of `{ from, to, amount }` (minimal number of settlements, no circular payments).

- **POST /api/groups/:id/settlements** or **POST /api/groups/:id/settlements/optimize**  
  - Calls `Split.getGroupBalances(groupId)` (expense-only).  
  - Calls `computeOptimizedSettlements(balances)`.  
  - Creates one Settlement per transaction: `fromUserId`, `toUserId`, `totalAmount` = `remainingAmount` = amount, status open.

---

## Payment logic (part payment required)

**Endpoint:** `POST /settlements/:id/pay`

**Body:**

```json
{ "amount": number }
```

**Rules:**

1. `amount > 0`
2. `amount <= remainingAmount`
3. Create Payment record `{ settlementId, amount, paidAt }`
4. `remainingAmount` decreases by `amount` (and paid total increases)
5. If `remainingAmount == 0` → settlement **closed** (e.g. status = paid)

Payments:

- Can happen **multiple times** (partial)
- Can be **partial**
- Can be to **different users** (different settlements)

**Location:** `backend/routes/settlementPay.js` — POST `/:settlementId/pay` (validates amount, creates Payment, updates Settlement; when new remaining ≤ 0, sets status to paid).

---

## When is a group settled?

A group is **settled** when:

- All settlements in the group have `remainingAmount = 0`.

Then:

- Group net for the user becomes 0 (all debts/claims for that group are cleared).
- Group can be shown as “Settled” or drop from “You owe” list.

---

## Example: 1 group, 4 expenses, 2 people to pay, part + full payment

**Group:** Trip Paris (users A, B, C)

**Expenses (all in group):**

| # | Payer | Amount | Split (equal) | A share | B share | C share |
|---|-------|--------|---------------|---------|---------|---------|
| 1 | A     | 120    | equal         | 40      | 40      | 40      |
| 2 | B     | 60     | equal         | 20      | 20      | 20      |
| 3 | C     | 60     | equal         | 20      | 20      | 20      |
| 4 | A     | 60     | equal         | 20      | 20      | 20      |

**Step 1 — Balances (expenses only):**

- A: totalPaid = 120 + 60 = 180, fairShare = 40+20+20+20 = 100 → **balance = +80**
- B: totalPaid = 60, fairShare = 100 → **balance = -40**
- C: totalPaid = 60, fairShare = 100 → **balance = -40**

**Step 2 — Settlements (2 people to pay):**

- B → A : 40  
- C → A : 40  

**Step 3 — Payment actions:**

- **Part payment:** User B pays 20 to A → Settlement B→A: remainingAmount = 40 - 20 = 20 (still open).
- **Full payment:** User B pays 20 again → B→A: remainingAmount = 0 → closed. User C pays 40 to A → C→A: remainingAmount = 0 → closed.
- Group is settled.

---

## How the UI gets data for each screen

### Screen 1 — Settle up by group (main screen)

**Data:**

- List of groups: **GET /api/groups** → `data.groups`.
- For each group, current user’s **net amount**:  
  **GET /api/settle/:groupId/balances** (or GET /api/groups/:id/balances) for each group → find the balance for current user in `data.balances`; that value is the net (+ receive / - owe).

**Display:** Group name + net amount (+$$$ or -$$$). No change to flow.

---

### Screen 2 — Group settlement (after clicking a group)

**Data:**

- **Group name:** From selected group (e.g. `groupsRes.groups` or group detail).
- **Net summary (“You owe X” / “You are owed Y”):**  
  **GET /api/settle/:groupId/balances** (or GET /api/groups/:id/balances) → from `data.balances` compute current user’s balance; if negative → “You owe |balance|”, if positive → “You are owed balance”.
- **List of people involved (Pay User → $X):**  
  **GET /api/groups/:id/settlements** → `data.settlements`.  
  For current user as **payer** (fromUserId = me), show each settlement as “Pay [toUser name] → [remainingAmount]”.  
  Each row: **amount input** + **“Pay”** button (sends that amount or full remaining).  
  **“Pay all”** button: for each such settlement, call pay with full remainingAmount.

**Display:** Top = group name + net summary. Middle = one row per person to pay: “Pay [name] → $X”, input, “Pay”; plus “Pay all”. No change to flow.

---

### Screen 3 — Payment action

**Action:**

- **POST /api/settlements/:id/pay** with body `{ "amount": number }`.
- After success, UI refetches **GET /api/groups/:id/settlements** (and optionally balances) so remaining amounts and “You owe” / “You are owed” stay in sync with backend.

---

## Forbidden (absolute)

- Per-expense payment  
- Auto settlement  
- Mark-as-paid without amount  
- Recalculating expenses after payment  
- Mixing UI and backend logic  

---

## Summary

| Item              | Where / How |
|-------------------|-------------|
| Balance calculation | `Split.calculateUserBalance`, `Split.getGroupBalances` (expenses only) |
| Settlement creation | `computeOptimizedSettlements` + POST /api/groups/:id/settlements (or /optimize) |
| Partial payment   | POST /settlements/:id/pay with `{ amount }` |
| Main screen data  | GET /groups + GET /settle/:groupId/balances per group |
| Group screen data | GET /settle/:groupId/balances + GET /groups/:id/settlements |
| Payment action    | POST /settlements/:id/pay → then refetch settlements |

The result matches the described UI and rules.
