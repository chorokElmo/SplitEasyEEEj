# Calculation and Data – Clean Model

## Core rules (do not change)

1. **Users ONLY add expenses** during the activity.
2. **NO payments affect calculation** of expenses or balances.
3. **Final balances are calculated ONLY from expenses.**
4. **Payments (full or partial) ONLY reduce settlement remaining amounts** – they never change expense records or balance calculation.

---

## Scenario

- Group with N friends.
- They add multiple expenses; each expense has: **payer**, **amount**, **split type** (equal or custom).
- **At the end**, each user sees **one final balance**:
  - **negative** → owes money  
  - **positive** → should receive money  

---

## Calculation rules (mandatory)

### 1. Compute total expenses per group

- Sum of all `expense.amount` where `expense.groupId = groupId`.

### 2. Compute each user’s fair share

- **Fair share** = sum of `split.shareAmount` for all splits where:
  - `split.userId = user`
  - and the split’s expense belongs to the group (`expense.groupId = groupId`).

### 3. Compute each user’s net balance

```text
netBalance = totalPaid - fairShare
```

Where:

- **totalPaid** = sum of `expense.amount` for all expenses where `expense.payerId = user` and `expense.groupId = groupId`.
- **fairShare** = as above.

So:

- **netBalance &lt; 0** → user **owes** money (paid less than their share).
- **netBalance &gt; 0** → user **should receive** money (paid more than their share).
- **netBalance = 0** → even.

### 4. Ignore payments in calculation

- Balances are computed **only** from **Expense** and **Split**.
- Settlement and Payment collections are **not** used when computing balances.

### 5. Payments never change expense records

- Recording a payment only updates **Settlement** (e.g. `remainingAmount`, `totalPaid`, `status`) and creates **Payment** rows.
- No expense or split is ever updated by a payment.

---

## Settlement creation

- **Input:** final net balances per user (from expense-only calculation).
- **Output:** settlements **only between debtors and creditors** (negative vs positive balance).
- **Goal:** one or **minimal number** of settlements per group (debt optimization).

Example:

- Omar: **-30** (owes 30)  
- Lina: **+30** (should receive 30)  

→ One settlement: **Omar owes Lina 30** (`fromUser = Omar`, `toUser = Lina`, `totalAmount = 30`, `remainingAmount = 30`).

Algorithm (high level): separate debtors (balance &lt; 0) and creditors (balance &gt; 0), then match them (e.g. greedy two-pointer) so that the sum of settlement amounts equals the absolute balances, with minimal number of edges.

---

## Payment rules (strict)

1. A settlement can be paid **fully** or **partially** (multiple payments).
2. **Partial payment:**
   - Reduces **remainingAmount** (and increases paid amount stored on the settlement).
   - Does **not** change the original balance calculation or any expense.
3. When **remainingAmount = 0**:
   - Settlement is **closed** (e.g. status = `paid`).
   - That debt is fully settled; the group is fully settled when all settlements are closed.

---

## Forbidden

- No per-expense payments (only settlement-level payments).
- No recalculation of balances after payment (balances stay expense-only).
- No mixing expenses and payments in the same formula.
- No multiple “mark as paid” on the same amount (backend enforces: no over-payment, no duplicate close).
- No frontend-only balance logic (backend is source of truth).

---

## Data models

### Expense

- `groupId`
- `payer` (or `payerId`)
- `amount`
- Splits: stored in a **Split** model per expense, e.g. `expenseId`, `userId`, `shareAmount`.  
  So effectively: **splits[]** per expense (one row per user-share).

### Settlement

- `groupId`
- `fromUser` (debtor; or `fromUserId`)
- `toUser` (creditor; or `toUserId`)
- `totalAmount`
- `remainingAmount`
- `status` (e.g. pending / partial / paid)

### Payment

- `settlementId`
- `amount`
- `paidAt`

---

## Required endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/groups/:groupId/balances` | Returns **final net balance per user** (expense-only). |
| POST | `/groups/:groupId/settlements` | Creates settlements from current (expense-only) balances. |
| POST | `/settlements/:id/pay` | Records a payment (body: `amount`). Supports partial payment; reduces remaining amount. |

---

## Example: 3 friends, 3 expenses

**Group:** Ali, Bob, Carol.

**Expenses:**

1. **Expense 1:** Payer = Ali, Amount = 60, Split = equal (3 people)  
   - Ali’s share: 20, Bob’s share: 20, Carol’s share: 20  

2. **Expense 2:** Payer = Bob, Amount = 30, Split = equal (3 people)  
   - Ali’s share: 10, Bob’s share: 10, Carol’s share: 10  

3. **Expense 3:** Payer = Carol, Amount = 30, Split = equal (3 people)  
   - Ali’s share: 10, Bob’s share: 10, Carol’s share: 10  

**Step 1 – Total paid (expenses only)**

- Ali paid: **60**
- Bob paid: **30**
- Carol paid: **30**  
- **Total group expenses:** 60 + 30 + 30 = **120**

**Step 2 – Fair share (from splits)**

- Ali’s fair share: 20 + 10 + 10 = **40**
- Bob’s fair share: 20 + 10 + 10 = **40**
- Carol’s fair share: 20 + 10 + 10 = **40**

**Step 3 – Net balance (only from expenses)**

- Ali: `netBalance = 60 - 40 = +20` (should receive 20)
- Bob: `netBalance = 30 - 40 = -10` (owes 10)
- Carol: `netBalance = 30 - 40 = -10` (owes 10)

**Step 4 – Settlements (from balances only)**

- One option (minimal):  
  - Settlement 1: Bob → Ali, **10** (Bob owes Ali 10)  
  - Settlement 2: Carol → Ali, **10** (Carol owes Ali 10)  

- Or equivalent:  
  - Bob → Carol 10, Carol → Ali 20 (same net, more edges; optimization prefers fewer).

**Step 5 – Payments (do not change balances)**

- Bob pays Ali 10 → Settlement 1: `remainingAmount = 0`, status **closed**.
- Carol pays Ali 10 → Settlement 2: `remainingAmount = 0`, status **closed**.
- Balances for the group are **still** computed only from the three expenses (Ali +20, Bob -10, Carol -10). Payments only reduce settlement remaining amounts; when both are closed, the group is fully settled.

---

## Summary

- **Balances:** from expenses and splits only; `netBalance = totalPaid - fairShare`.
- **Settlements:** created from these net balances; one or minimal number of debtor–creditor pairs.
- **Payments:** only reduce settlement `remainingAmount`; when it reaches 0, settlement is closed. No recalculation of expenses or balances.
