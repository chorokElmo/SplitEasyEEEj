# SplitEasy – Required Output (Fixed UI Flow)

**Stack:** React, Node.js + Express, MongoDB (Mongoose)

---

## 1. Backend calculation functions

**Rule 1:** Expenses are the ONLY thing used to calculate balances.  
**Rule 2:** For each user in the group: `totalPaid` = sum(expenses paid by user), `fairShare` = sum(expense splits for user), `netBalance` = totalPaid - fairShare.  
**Rule 3:** Payments do NOT affect expense calculation; they only reduce what is owed (settlement remainingAmount).

### Location: `backend/models/Split.js`

**`Split.calculateUserBalance(userId, groupId)`**

- `totalPaid` = sum of `expense.amount` where `expense.groupId = groupId` and `expense.payerId = userId`
- `totalOwed` (fairShare) = sum of `split.shareAmount` where `split.userId = userId` and the split’s expense belongs to the group
- `balance` = totalPaid - totalOwed
- Returns `{ totalPaid, totalOwed, balance }`. Computed every time; never stored or cached.

**`Split.getGroupBalances(groupId)`**

- For each group member, calls `calculateUserBalance(member.userId._id, groupId)`
- Returns array of `{ userId, user, totalPaid, totalOwed, balance }` (balance rounded to 2 decimals)
- Uses only Expense and Split; no Settlement or Payment

---

## 2. Settlement creation logic

From net balances: netBalance < 0 → user OWES; netBalance > 0 → user RECEIVES.

**Settlement shape:** `{ groupId, fromUserId, toUserId, totalAmount, remainingAmount }` (fromUser = debtor, toUser = creditor).

**Example:** User A: -90, User B: +40, User C: +50 → Settlements: A→B: 40, A→C: 50.

### Location: `backend/utils/debtOptimization.js`

**`computeOptimizedSettlements(balances)`**

- Input: array of `{ userId, balance }` from Step 1 (expense-only)
- Separates debtors (balance < 0) and creditors (balance > 0); ignores zero
- Greedy two-pointer: match debtor with creditor, amount = min(debtor remaining, creditor remaining)
- Returns array of `{ from, to, amount }` (minimal number of settlements, no circular payments)

### Location: `backend/controllers/groupController.js` + routes

**POST /api/groups/:id/settlements** (or **POST /api/groups/:id/settlements/optimize**)

- Calls `Split.getGroupBalances(groupId)` (expense-only)
- Calls `computeOptimizedSettlements(balances)`
- For each `{ from, to, amount }`: creates Settlement with `fromUserId`, `toUserId`, `totalAmount` = `remainingAmount` = amount, status open (e.g. pending)

---

## 3. Partial payment endpoint

**POST /settlements/:id/pay** (API base: `/api`, so **POST /api/settlements/:id/pay**)

**Body:** `{ "amount": number }`

**Rules:**

- amount > 0
- amount <= remainingAmount
- Create Payment record `{ settlementId, amount, paidAt }`
- remainingAmount decreases by amount (and totalPaid increases)
- If remainingAmount == 0 → settlement closed (status = paid)

Payments can happen multiple times, can be partial, and can be to different users (different settlements).

### Location: `backend/routes/settlementPay.js`

- POST `/:settlementId/pay` validates amount, creates Payment, updates Settlement (remainingAmount -= amount); when new remaining ≤ 0, sets status to paid. Expenses are never touched; balances are not recalculated in this step.

---

## 4. Example: 1 group, 4 expenses, 2 people to pay, part + full payment

**Group:** Trip (users A, B, C)

**Expenses (all in group):**

| # | Payer | Amount | Split (equal) | A share | B share | C share |
|---|-------|--------|---------------|---------|---------|---------|
| 1 | A     | 120    | equal         | 40      | 40      | 40      |
| 2 | B     | 60     | equal         | 20      | 20      | 20      |
| 3 | C     | 60     | equal         | 20      | 20      | 20      |
| 4 | A     | 60     | equal         | 20      | 20      | 20      |

**Step 1 – Balances (expenses only):**

- A: totalPaid = 180, fairShare = 100 → **netBalance = +80**
- B: totalPaid = 60, fairShare = 100 → **netBalance = -40**
- C: totalPaid = 60, fairShare = 100 → **netBalance = -40**

**Step 2 – Settlements (2 people to pay):**

- B → A : 40  
- C → A : 40  

**Step 3 – Part payment:**

- B pays 20 to A → POST /settlements/:id/pay `{ "amount": 20 }` → Settlement B→A: remainingAmount = 20 (still open)

**Step 4 – Full payment:**

- B pays 20 again → B→A: remainingAmount = 0 → closed  
- C pays 40 to A → C→A: remainingAmount = 0 → closed  

Group is settled. Expenses unchanged; balances not recalculated after payments.

---

## 5. How UI gets data for EACH screen

### Screen 1 – SETTLE UP BY GROUP (main screen)

**Display:** List of ALL groups; each row: group name + net amount (+$$$ or -$$$). Example: [ Apartment ] -120$, [ Trip Paris ] +80$.

**Data:**

- **Groups:** GET /api/groups → `data.groups`
- **Net amount per group:** For each group, GET /api/settle/:groupId/balances (or GET /api/groups/:id/balances) → in `data.balances`, find the entry where `userId` = current user; use that entry’s `balance` as the net amount (+ receive / - owe)

**UI:** Renders one row per group: group title + formatted balance (e.g. “-120$” or “+80$”). No flow change.

---

### Screen 2 – GROUP SETTLEMENT (after clicking a group)

**Display:**

- **Top:** Group name + net summary: “You owe 120$” OR “You are owed 80$”
- **Middle:** List of people involved; each person separately: “Pay User 1 → 40$”, “Pay User 2 → 50$”
- **Per person:** Button “Pay” + input (amount)
- **Also:** Button “Pay all”

**Data:**

- **Group name:** From selected group (e.g. `groupsRes.groups` or group detail)
- **Net summary:** GET /api/settle/:groupId/balances (or GET /api/groups/:id/balances) → current user’s `balance` in `data.balances`; if negative → “You owe |balance|$”, if positive → “You are owed balance$”
- **List of people (Pay X → $Y):** GET /api/groups/:id/settlements → `data.settlements`. For current user as **payer** (fromUserId = me), each settlement is one row: “Pay [toUser name] → [remainingAmount]$”. Each row has an amount input and “Pay” button; “Pay all” pays full remaining for each such settlement.

**UI:** Top = group name + one line net summary. Middle = one card/row per settlement where I am payer: “Pay [name] → [remaining]$”, number input, “Pay” button; plus “Pay all” button. No flow change.

---

### Screen 3 – PAYMENT ACTION

**Action:** User enters amount (or leaves empty for full) and clicks “Pay” (or “Pay all”).

**API:** POST /api/settlements/:id/pay with body `{ "amount": number }`. Amount must be > 0 and ≤ remainingAmount.

**After success:** UI refetches GET /api/groups/:id/settlements (and optionally balances) so remaining amounts and “You owe” / “You are owed” stay in sync with backend.

---

## Forbidden (absolute)

- Per-expense payment  
- Auto settlement  
- Mark-as-paid without amount  
- Recalculating expenses after payment  
- Mixing UI and backend logic  

---

## When is a group settled?

When all settlements in the group have remainingAmount = 0. Then the group net for the user is 0 and the group can be shown as settled or removed from the “You owe” list.

---

## Summary

| Item | Where / How |
|------|-------------|
| **1. Backend calculation** | `Split.calculateUserBalance`, `Split.getGroupBalances` (expenses only) |
| **2. Settlement creation** | `computeOptimizedSettlements` + POST /api/groups/:id/settlements (or /optimize) |
| **3. Partial payment** | POST /api/settlements/:id/pay with `{ amount }` |
| **4. Example** | 1 group, 4 expenses, 2 people to pay (B→A:40, C→A:40); part then full payment |
| **5. UI data** | Screen 1: GET /groups + GET /settle/:groupId/balances per group; Screen 2: GET /settle/:groupId/balances + GET /groups/:id/settlements; Payment: POST /settlements/:id/pay then refetch |

The result matches the described UI and rules.
