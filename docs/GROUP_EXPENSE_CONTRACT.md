# Group Expense Calculation – Contract (SplitEasy)

**Stack:** Node.js, Express, MongoDB (Mongoose)

---

## Non-negotiable invariants

| ID | Invariant |
|----|-----------|
| **I1** | EXPENSES are the ONLY source of truth for balances. |
| **I2** | PAYMENTS NEVER affect expense calculation. |
| **I3** | BALANCES are computed from ALL expenses EVERY TIME. |
| **I4** | PAYMENTS ONLY reduce FINAL balances (settlement remainingAmount); nothing else. |
| **I5** | WHEN balance == 0 → user is settled. |

If any invariant is violated, the solution is invalid.

---

## Data model (fixed)

```text
Expense {
  groupId
  payerId
  amount
  splits: [{ userId, share }]   // stored as Split docs: expenseId, userId, shareAmount
}

Settlement {
  groupId
  fromUserId
  toUserId
  totalAmount
  remainingAmount
  status   // open = pending|partial, closed = paid (remainingAmount == 0)
}

Payment {
  settlementId
  amount
  paidAt
}
```

---

## Step 1 — Balance calculation (mandatory)

**Rule:** Balances are COMPUTED every time. Never stored or cached.

For each user in the group:

1. **paid** = sum(expense.amount where expense.payerId == userId and expense.groupId == groupId)
2. **owed** = sum(split.shareAmount where split.userId == userId and split’s expense belongs to group)
3. **balance** = paid - owed

- **balance > 0** → user receives money  
- **balance < 0** → user owes money  
- **balance == 0** → user is settled (I5)

**Exact functions (implementation):**

- **Single user:** `Split.calculateUserBalance(userId, groupId)`  
  - Returns `{ totalPaid, totalOwed, balance }` with balance = totalPaid - totalOwed.  
  - Uses: Expense.find({ groupId, payerId: userId }) for paid; Split (+ expense in group) for owed.
- **All members:** `Split.getGroupBalances(groupId)`  
  - For each member, calls calculateUserBalance; returns array of `{ userId, user, totalPaid, totalOwed, balance }`.  
  - No Settlement or Payment collection is read.

**DO NOT:** store balances, cache balances, mutate balances. They must be computed.

---

## Step 2 — Settlement generation (mandatory)

**Input:** Balances from Step 1 (expense-only).

- **Creditors:** users with balance > 0  
- **Debtors:** users with balance < 0  

**Output:** Settlements such that:

- remainingAmount == totalAmount == absolute value transferred for that edge  
- Total settlements cover total debts  
- Minimal number of settlements  
- No circular payments  

**Exact function (implementation):** `computeOptimizedSettlements(balances)` in `utils/debtOptimization.js`  
- Splits into debtors (balance < 0) and creditors (balance > 0).  
- Greedy two-pointer: match debtor with creditor, amount = min(debtor remaining, creditor remaining); then advance.  
- Returns array of `{ from, to, amount }`.

**Example (must match):**

```text
A: +30
B: -10
C: -20

Settlements:
  B → A : 10
  C → A : 20
```

Persist each as Settlement: fromUserId, toUserId, totalAmount = remainingAmount = amount, status = open (e.g. pending).

---

## Step 3 — Payment application (strict)

**Endpoint:** `POST /settlements/:id/pay`  
**Request:** `{ "amount": number }`

**Rules:**

1. amount > 0  
2. amount <= remainingAmount  
3. Create Payment record { settlementId, amount, paidAt }  
4. remainingAmount -= amount (and totalPaid += amount on Settlement)  
5. If remainingAmount == 0 → status = **closed** (implementation: status = 'paid')

**Important:**

- EXPENSES are never touched.  
- BALANCES are never recalculated in this step.

**Exact implementation:** `routes/settlementPay.js` POST `/:settlementId/pay` — validates amount, creates Payment, updates Settlement with $inc totalPaid and -remainingAmount, sets status to paid when new remaining <= 0.

---

## Step 4 — User view (critical)

When a user opens the group:

1. **Show balances** computed from expenses (Step 1; e.g. GET /groups/:id/balances).  
2. **Settlement remaining:** From settlements, “You owe X” = sum(remainingAmount) where fromUserId = currentUser and status is open; “You are owed Y” = sum(remainingAmount) where toUserId = currentUser and status is open.  
3. Display: “You owe X” or “You are owed Y” (and balance from expenses).

No other logic is allowed.

---

## Forbidden (absolute)

- Per-expense payment  
- Balance mutation  
- Payment changing expenses  
- Mark-as-paid without amount  
- Auto settlement (without explicit create-from-balances step)  
- Silent recalculation (balances only from expenses, every time)

---

## Full example: 3 users, 4 expenses

**Users:** A, B, C (group of 3).

**Expenses (all in same group):**

| # | Payer | Amount | Split (equal) | A share | B share | C share |
|---|-------|--------|---------------|---------|---------|---------|
| 1 | A     | 60     | equal         | 20      | 20      | 20      |
| 2 | B     | 30     | equal         | 10      | 10      | 10      |
| 3 | C     | 30     | equal         | 10      | 10      | 10      |
| 4 | A     | 30     | equal         | 10      | 10      | 10      |

---

### Step 1 — Balance calculation (numbers)

**paid (per user):**

- A: 60 + 30 = **90**  
- B: **30**  
- C: **30**  

**owed (fair share from splits):**

- A: 20 + 10 + 10 + 10 = **50**  
- B: 20 + 10 + 10 + 10 = **50**  
- C: 20 + 10 + 10 + 10 = **50**  

**balance = paid - owed:**

- A: 90 - 50 = **+40** (receives money)  
- B: 30 - 50 = **-20** (owes money)  
- C: 30 - 50 = **-20** (owes money)  

Check: sum of balances = 40 - 20 - 20 = 0.

---

### Step 2 — Settlement generation (numbers)

**Creditors:** A (+40)  
**Debtors:** B (20), C (20)

**Minimal settlements (two edges):**

- B → A : **20** (B debt 20, A claim 40 → settle 20)
- C → A : **20** (C debt 20, A claim 20 → settle 20)

**Settlements (canonical minimal):**

| From | To | totalAmount | remainingAmount | status |
|------|----|-------------|-----------------|--------|
| B    | A  | 20         | 20              | open   |
| C    | A  | 20         | 20              | open   |

---

### Step 3 — Payment application (numbers)

**Payment 1:** B pays 20 to A (settlement B→A)

- Create Payment { settlementId: B→A, amount: 20, paidAt: now }  
- remainingAmount = 20 - 20 = **0** → status = **closed**  
- Expenses unchanged. Balances not recalculated.

**Payment 2:** C pays 20 to A (settlement C→A)

- Create Payment { settlementId: C→A, amount: 20, paidAt: now }  
- remainingAmount = 20 - 20 = **0** → status = **closed**  
- Expenses unchanged. Balances not recalculated.

**After payments:**  
Both settlements closed. Group is fully settled. Expense-based balances remain A: +40, B: -20, C: -20; settlement remaining amounts are all 0.

---

### Step 4 — User view (numbers)

**Balances (from expenses only, unchanged by payments):**

- A: +40  
- B: -20  
- C: -20  

**Open settlement remaining (after payments above):**

- A: “You are owed” = 0 (both settlements to A are closed)  
- B: “You owe” = 0 (B→A closed)  
- C: “You owe” = 0 (C→A closed)  

Display: e.g. “You are owed 0” (A), “You owe 0” (B, C). When balance == 0 and all settlements closed, user is settled (I5).

---

## Summary

| Step | What | Where |
|------|------|--------|
| 1    | Balance = paid - owed from expenses only; computed every time | `Split.calculateUserBalance`, `Split.getGroupBalances` |
| 2    | Settlements from balances; creditors/debtors; minimal edges | `computeOptimizedSettlements`, group controller create settlements |
| 3    | POST /settlements/:id/pay: create Payment, remainingAmount -= amount, status = closed when 0 | `routes/settlementPay.js` |
| 4    | User view: balances from Step 1; “You owe” / “You are owed” from open settlement remainingAmounts | Frontend + GET /groups/:id/balances, GET /groups/:id/settlements |

All invariants I1–I5 are satisfied; no forbidden behavior is introduced.
