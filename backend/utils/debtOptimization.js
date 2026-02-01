/**
 * Step 2 — Settlement generation (CONTRACT).
 * Input: balances from Step 1 (expense-only). Creditors (balance > 0), Debtors (balance < 0).
 * Output: minimal settlements; remainingAmount = amount; no circular payments.
 * Example (must match): A:+30, B:-10, C:-20 → B→A:10, C→A:20.
 *
 * @param {Array<{ userId, balance: number }>} balances - Per-user net balances (Step 1 only).
 * @param {number} [epsilon=0.01] - Ignore amounts smaller than this.
 * @returns {Array<{ from, to, amount }>} Settlements.
 */
function computeOptimizedSettlements(balances, epsilon = 0.01) {
  const toId = (id) => (id && typeof id === 'object' && id.toString ? id.toString() : String(id));

  const debtors = [];
  const creditors = [];

  for (const entry of balances) {
    const userId = toId(entry.userId);
    const balance = Number(entry.balance);
    if (Math.abs(balance) < epsilon) continue;
    if (balance < 0) {
      debtors.push({ userId, amount: Math.abs(balance) });
    } else {
      creditors.push({ userId, amount: balance });
    }
  }

  // Sort by amount descending (largest first) for consistent, large-first ordering
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transactions = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const d = debtors[i];
    const c = creditors[j];
    const amount = Math.min(d.amount, c.amount);
    if (amount < epsilon) {
      if (d.amount < epsilon) i++;
      if (c.amount < epsilon) j++;
      continue;
    }
    transactions.push({
      from: d.userId,
      to: c.userId,
      amount: Math.round(amount * 100) / 100,
    });
    d.amount -= amount;
    c.amount -= amount;
    if (d.amount < epsilon) i++;
    if (c.amount < epsilon) j++;
  }

  // Optional: sort by amount descending for display (largest first)
  transactions.sort((a, b) => b.amount - a.amount);

  return transactions;
}

module.exports = { computeOptimizedSettlements };
