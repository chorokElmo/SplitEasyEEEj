import { useEffect, useMemo, useState } from 'react'
import { Input } from '../components/ui/input'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import LoadingSpinner from '../components/ui/loading-spinner'
import api from '../lib/api'
import {
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Users,
  CheckCircle2,
  ChevronRight,
  Search,
  Zap,
  Receipt,
  Undo2,
} from 'lucide-react'
import { formatCurrency, getInitials, getAvatarColor } from '../lib/utils'
import { useToast } from '../components/ui/use-toast'
import { useAuth } from '../contexts/AuthContext'

const formatMAD = (amount) => formatCurrency(amount || 0, 'MAD')

function StatusBadge({ rawStatus, status }) {
  const { t } = useTranslation()
  const displayStatus =
    rawStatus === 'awaiting_confirmation'
      ? t('settle.awaitingConfirmation', 'Awaiting Confirmation')
      : rawStatus === 'pending' || status === 'unpaid'
        ? t('settle.pending', 'Pending')
        : rawStatus === 'paid' || rawStatus === 'accepted'
          ? t('settle.paidDone', 'Paid ✓')
          : t('settle.partial', 'Partial')

  const style =
    rawStatus === 'awaiting_confirmation'
      ? 'bg-amber-100 text-amber-800 border-amber-300'
      : rawStatus === 'pending' || status === 'unpaid'
        ? 'bg-red-100 text-red-800 border-red-300'
        : rawStatus === 'paid' || rawStatus === 'accepted'
          ? 'bg-green-100 text-green-800 border-green-300'
          : 'bg-slate-100 text-slate-800 border-slate-300'

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${style}`}
    >
      {displayStatus}
    </span>
  )
}

const SettlePage = () => {
  const { t } = useTranslation()
  const [selectedGroup, setSelectedGroup] = useState('')
  const [listTab, setListTab] = useState('all') // 'toPay' | 'toReceive' | 'completed' | 'all'
  const [searchQuery, setSearchQuery] = useState('')
  const [confirmPay, setConfirmPay] = useState(null) // { settlementId, amount, toName, remaining }
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const currentUserId = user?._id?.toString()

  // Fetch groups
  const { data: groupsRes, isLoading: groupsLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const response = await api.get('/groups')
      return response.data.data
    },
  })

  const groups = groupsRes?.groups || []

  // Fetch balances for all groups
  const { data: allGroupsBalances, isLoading: balancesLoading } = useQuery({
    enabled: groups.length > 0,
    queryKey: ['all-groups-balances', groups.map((g) => g._id).join(',')],
    refetchOnMount: true,
    queryFn: async () => {
      const balances = {}
      for (const group of groups) {
        try {
          const response = await api.get(`/settle/${group._id}/balances`)
          balances[group._id] = response.data.data.balances || []
        } catch {
          balances[group._id] = []
        }
      }
      return balances
    },
  })

  useEffect(() => {
    if (!selectedGroup && groups.length) setSelectedGroup(groups[0]._id)
  }, [groups, selectedGroup])

  // Canonical settlements for selected group
  const { data: groupSettlementsData, isLoading: settlementsLoading } = useQuery({
    enabled: !!selectedGroup,
    queryKey: ['groupSettlements', selectedGroup],
    refetchOnMount: true,
    queryFn: async () => {
      const response = await api.get(`/groups/${selectedGroup}/settlements`)
      return response.data.data
    },
  })

  const groupSettlements = groupSettlementsData?.settlements || []

  // Fetch recent group expenses (who paid + split breakdown)
  const { data: groupExpensesData } = useQuery({
    enabled: !!selectedGroup,
    queryKey: ['expenses', selectedGroup],
    queryFn: async () => {
      const response = await api.get(`/expenses/${selectedGroup}?limit=10&sortBy=createdAt&sortOrder=desc`)
      return response.data.data
    },
  })
  const groupExpenses = groupExpensesData?.expenses || []

  const invalidationKeys = useMemo(
    () => [
      ['groupSettlements', selectedGroup],
      ['balances', selectedGroup],
      ['all-groups-balances'],
    ],
    [selectedGroup]
  )

  const refetchSettlements = () => {
    invalidationKeys.forEach((key) => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.refetchQueries({ queryKey: key })
    })
  }

  // Summary from settlements (current group)
  const summary = useMemo(() => {
    let youOwe = 0
    let youAreOwed = 0
    let completedCount = 0
    groupSettlements.forEach((s) => {
      const rawStatus = s.rawStatus ?? s.status
      const payerId = s.payerId?.toString?.() || s.payerId
      const receiverId = s.receiverId?.toString?.() || s.receiverId
      const remaining = parseFloat(s.remainingAmount) ?? 0
      const total = parseFloat(s.totalAmount) ?? 0
      if (rawStatus === 'paid' || rawStatus === 'accepted') {
        completedCount += 1
        return
      }
      if (payerId === currentUserId && remaining > 0.01) youOwe += remaining
      if (receiverId === currentUserId && remaining > 0.01) youAreOwed += remaining
    })
    return { youOwe, youAreOwed, completedCount }
  }, [groupSettlements, currentUserId])

  // Filter by tab
  const filteredByTab = useMemo(() => {
    if (listTab === 'all') return groupSettlements
    return groupSettlements.filter((s) => {
      const rawStatus = s.rawStatus ?? s.status
      const payerId = s.payerId?.toString?.() || s.payerId
      const receiverId = s.receiverId?.toString?.() || s.receiverId
      const isPayer = payerId === currentUserId
      const isReceiver = receiverId === currentUserId
      const isPaid = rawStatus === 'paid' || rawStatus === 'accepted'
      if (listTab === 'toPay') return isPayer && !isPaid
      if (listTab === 'toReceive') return isReceiver && !isPaid
      if (listTab === 'completed') return isPaid
      return true
    })
  }, [groupSettlements, listTab, currentUserId])

  // Filter by search (name or amount)
  const filteredSettlements = useMemo(() => {
    if (!searchQuery.trim()) return filteredByTab
    const q = searchQuery.trim().toLowerCase()
    return filteredByTab.filter((s) => {
      const fromName = (s.fromUserId?.username || '').toLowerCase()
      const toName = (s.toUserId?.username || '').toLowerCase()
      const amount = String(s.remainingAmount ?? s.totalAmount ?? '')
      return fromName.includes(q) || toName.includes(q) || amount.includes(q)
    })
  }, [filteredByTab, searchQuery])

  const hasUnbalancedDebts = useMemo(() => {
    if (!selectedGroup || !allGroupsBalances?.[selectedGroup]) return false
    const balances = allGroupsBalances[selectedGroup]
    return balances.some((b) => Math.abs(parseFloat(b.balance || 0)) > 0.01)
  }, [selectedGroup, allGroupsBalances])

  // Mutations
  const paySettlementMutation = useMutation({
    mutationFn: async ({ settlementId, amount }) => {
      const payload = amount != null && amount > 0 ? { amount: parseFloat(amount) } : {}
      const response = await api.post(`/settlements/${settlementId}/pay`, payload)
      return response.data
    },
    onSuccess: () => {
      toast({
        title: t('settle.paymentSettled'),
        description: t('settle.paymentSettledDesc'),
      })
      refetchSettlements()
    },
    onError: (err) => {
      const msg = err.response?.data?.message || err.message
      toast({
        variant: 'destructive',
        title: t('settle.failedToSettlePayment'),
        description: msg,
      })
    },
  })

  const confirmSettlementMutation = useMutation({
    mutationFn: async (settlementId) => {
      const response = await api.post(`/settlements/${settlementId}/confirm`)
      return response.data
    },
    onSuccess: () => {
      toast({
        title: t('settle.settlementAccepted'),
        description: t('settle.settlementAcceptedDesc'),
      })
      refetchSettlements()
    },
    onError: (err) => {
      const msg = err.response?.data?.message || err.message
      toast({
        variant: 'destructive',
        title: t('settle.failedToSettlePayment'),
        description: msg,
      })
    },
  })

  const undoPaymentMutation = useMutation({
    mutationFn: async (settlementId) => {
      const response = await api.post(`/settlements/${settlementId}/undo`)
      return response.data
    },
    onSuccess: () => {
      toast({
        title: t('settle.paymentRemoved'),
        description: t('settle.paymentRemovedDesc'),
      })
      refetchSettlements()
    },
    onError: (err) => {
      const msg = err.response?.data?.message || err.message
      toast({
        variant: 'destructive',
        title: t('settle.failedToRemovePayment'),
        description: msg,
      })
    },
  })

  const optimizeMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/groups/${selectedGroup}/settlements/optimize`)
      return response.data
    },
    onSuccess: () => {
      toast({
        title: t('settle.optimizeSettlements'),
        description: t('settle.optimizeSettlementsDesc'),
      })
      refetchSettlements()
    },
    onError: (err) => {
      toast({
        variant: 'destructive',
        title: t('settle.failedToSettlePayment'),
        description: err.response?.data?.message || err.message,
      })
    },
  })

  const handleRequestPay = (settlementId, amount, toName, remaining) => {
    setConfirmPay({ settlementId, amount, toName, remaining })
  }

  const handleConfirmPay = () => {
    if (!confirmPay) return
    paySettlementMutation.mutate(
      { settlementId: confirmPay.settlementId, amount: confirmPay.amount },
      { onSettled: () => setConfirmPay(null) }
    )
  }

  const handleConfirm = (settlementId) => {
    confirmSettlementMutation.mutate(settlementId)
  }

  const handleUndoPayment = (settlementId) => {
    undoPaymentMutation.mutate(settlementId)
  }

  if (groupsLoading || balancesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Confirm payment dialog */}
      <Dialog open={!!confirmPay} onOpenChange={(open) => !open && setConfirmPay(null)}>
        <DialogContent className="rounded-xl border border-border shadow-soft-lg">
          <DialogHeader>
            <DialogTitle>{t('settle.confirmPayment')}</DialogTitle>
            <DialogDescription>
              {confirmPay
                ? t('settle.confirmPaymentDesc', {
                    amount: formatMAD(confirmPay.amount ?? confirmPay.remaining),
                    name: confirmPay.toName,
                  })
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setConfirmPay(null)}
              className="rounded-xl"
            >
              {t('common.cancel')}
            </Button>
            <Button
              className="rounded-xl font-medium"
              onClick={handleConfirmPay}
              disabled={paySettlementMutation.isPending}
            >
              {paySettlementMutation.isPending ? t('common.loading') : t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
          {t('settle.title')}
        </h1>
        <p className="text-muted-foreground mt-1">{t('settle.subtitle')}</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-red-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('settle.youOweSummary', 'You owe')}
            </CardTitle>
            <ArrowUpRight className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatMAD(summary.youOwe)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('settle.totalAmountToPay')}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('settle.youAreOwedSummary', 'You are owed')}
            </CardTitle>
            <ArrowDownLeft className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatMAD(summary.youAreOwed)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('settle.totalAmountOwedToYou')}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('settle.completedSummary', 'Completed')}
            </CardTitle>
            <CheckCircle2 className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {summary.completedCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('settle.completedSettlements')}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Group selector */}
        <div className="lg:col-span-1">
          <Card className="border-2 border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                {t('settle.yourGroups')}
              </CardTitle>
              <CardDescription>
                {t('settle.selectGroupToViewSettlements')}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1 p-3">
                {groups.map((group) => {
                  const balances = allGroupsBalances?.[group._id] || []
                  const userBal = balances.find(
                    (b) =>
                      (b.userId?._id ?? b.userId)?.toString() === currentUserId
                  )
                  const balance = parseFloat(userBal?.balance || 0)
                  const isSelected = selectedGroup === group._id
                  return (
                    <button
                      key={group._id}
                      type="button"
                      onClick={() => setSelectedGroup(group._id)}
                      className={`w-full text-left p-3 rounded-lg transition-all duration-200 flex items-center justify-between ${
                        isSelected
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'bg-card border border-border/50 hover:border-primary/50 hover:bg-primary/5'
                      }`}
                    >
                      <span className="font-medium text-sm truncate">
                        {group.title}
                      </span>
                      <span
                        className={`text-xs ml-2 ${
                          isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                        }`}
                      >
                        {Math.abs(balance) > 0.01
                          ? `${balance < 0 ? '-' : '+'}${formatMAD(Math.abs(balance))}`
                          : t('settle.settled')}
                      </span>
                      <ChevronRight
                        className={`h-4 w-4 shrink-0 ${
                          isSelected ? 'text-primary-foreground' : 'text-muted-foreground'
                        }`}
                      />
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main content */}
        <div className="lg:col-span-3 space-y-4">
          {!selectedGroup ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-lg font-semibold mb-2">
                  {t('settle.selectAGroup')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('settle.chooseGroupToViewSettlements')}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Optimize + Search + Tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {hasUnbalancedDebts && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => optimizeMutation.mutate()}
                      disabled={optimizeMutation.isPending}
                      className="border-amber-500 text-amber-700 hover:bg-amber-50"
                    >
                      <Zap className="h-4 w-4 me-2" />
                      {optimizeMutation.isPending
                        ? t('common.loading', 'Loading...')
                        : t('settle.optimizeSettlements')}
                    </Button>
                  )}
                  <div className="relative flex-1 min-w-[200px] max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t('settle.searchPlaceholder', 'Search by name or amount...')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>
                </div>
                <div className="flex gap-1 border-b border-border">
                  {[
                    { key: 'all', label: t('settle.allTab', 'All') },
                    { key: 'toPay', label: t('settle.toPay') },
                    { key: 'toReceive', label: t('settle.toReceive') },
                    { key: 'completed', label: t('settle.completedSettlements') },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setListTab(key)}
                      className={`px-3 py-2 text-sm font-medium rounded-t-md transition-colors ${
                        listTab === key
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {settlementsLoading ? (
                <Card>
                  <CardContent className="py-12 flex justify-center">
                    <LoadingSpinner size="lg" />
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>{t('settle.settlements')}</CardTitle>
                    <CardDescription>
                      From → To, amount, status and actions
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left font-medium p-3">From</th>
                          <th className="w-8 p-2" aria-hidden />
                          <th className="text-left font-medium p-3">To</th>
                          <th className="text-right font-medium p-3">Amount</th>
                          <th className="text-center font-medium p-3">Status</th>
                          <th className="text-right font-medium p-3">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSettlements.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-muted-foreground">
                              {listTab === 'all'
                                ? t('settle.noSettlementsRecorded')
                                : t('settle.noFilteredSettlements', {
                                    filter: listTab,
                                  })}
                            </td>
                          </tr>
                        ) : (
                          filteredSettlements.map((s) => {
                            const sid = s.id || s._id?.toString()
                            const fromName =
                              s.fromUserId?.username ?? s.payerId?.username ?? '—'
                            const toName =
                              s.toUserId?.username ?? s.receiverId?.username ?? '—'
                            const total = parseFloat(s.totalAmount) ?? 0
                            const remaining =
                              parseFloat(s.remainingAmount) ?? Math.max(0, total - parseFloat(s.paidAmount || 0))
                            const rawStatus = s.rawStatus ?? s.status
                            const status = s.status ?? 'unpaid'
                            const isPaid =
                              rawStatus === 'paid' || rawStatus === 'accepted'
                            const awaitingConfirmation =
                              rawStatus === 'awaiting_confirmation'
                            const isPayer =
                              (s.payerId?.toString?.() || s.payerId) === currentUserId
                            const isReceiver =
                              (s.receiverId?.toString?.() || s.receiverId) ===
                              currentUserId

                            return (
                              <tr
                                key={sid}
                                className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                              >
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium shrink-0 ${getAvatarColor(
                                        fromName
                                      )}`}
                                    >
                                      {getInitials(fromName)}
                                    </div>
                                    <span className="font-medium truncate max-w-[120px]">
                                      {fromName}
                                    </span>
                                  </div>
                                </td>
                                <td className="p-2 text-muted-foreground text-center">
                                  →
                                </td>
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium shrink-0 ${getAvatarColor(
                                        toName
                                      )}`}
                                    >
                                      {getInitials(toName)}
                                    </div>
                                    <span className="font-medium truncate max-w-[120px]">
                                      {toName}
                                    </span>
                                  </div>
                                </td>
                                <td className="p-3 text-right font-semibold">
                                  {isPaid ? formatMAD(total) : formatMAD(remaining)}
                                </td>
                                <td className="p-3 text-center">
                                  <StatusBadge rawStatus={rawStatus} status={status} />
                                </td>
                                <td className="p-3 text-right">
                                  {isPaid ? (
                                    <span className="text-green-600 inline-flex items-center gap-1">
                                      <CheckCircle2 className="h-4 w-4" /> ✓
                                    </span>
                                  ) : awaitingConfirmation && isReceiver ? (
                                    <Button
                                      size="sm"
                                      className="bg-amber-600 hover:bg-amber-700 text-white"
                                      onClick={() => handleConfirm(sid)}
                                      disabled={confirmSettlementMutation.isPending}
                                    >
                                      {t('settle.confirmReceived', 'Confirm Received')}
                                    </Button>
                                  ) : isPayer && remaining > 0.01 ? (
                                    <SettlementRowActions
                                      settlementId={sid}
                                      remaining={remaining}
                                      toName={toName}
                                      onRequestPay={handleRequestPay}
                                      isPaying={paySettlementMutation.isPending}
                                      t={t}
                                      formatMAD={formatMAD}
                                    />
                                  ) : (rawStatus === 'partial' || isPaid) && (isPayer || isReceiver) ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-muted-foreground hover:text-destructive hover:border-destructive"
                                      onClick={() => handleUndoPayment(sid)}
                                      disabled={undoPaymentMutation.isPending}
                                      title={t('settle.undoLastPayment')}
                                    >
                                      <Undo2 className="h-4 w-4 me-1" />
                                      {t('settle.removePayment')}
                                    </Button>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">
                                      —
                                    </span>
                                  )}
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}

              {/* Group expenses: who paid + split breakdown */}
              {selectedGroup && groupExpenses.length > 0 && (
                <details className="border rounded-lg bg-card">
                  <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-2">
                    <Receipt className="h-4 w-4" />
                    {t('settle.groupExpenses', 'Group expenses')} — {t('expenses.paidBy', 'Paid by')} & {t('expenses.splitPreview', 'Split preview')}
                  </summary>
                  <div className="p-4 pt-0 space-y-3 border-t">
                    {groupExpenses.slice(0, 10).map((exp) => {
                      const payerName = exp.payerId?.username ?? '—'
                      const amount = parseFloat(exp.amount) ?? 0
                      const splits = exp.splits || []
                      return (
                        <div key={exp._id} className="p-3 rounded-lg border bg-muted/20 space-y-2">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="font-medium">{exp.description}</span>
                            <span className="text-sm font-semibold">{formatMAD(amount)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{t('expenses.paidBy', 'Paid by')}:</span>
                            <span className="inline-flex items-center gap-1">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium ${getAvatarColor(payerName)}`}>
                                {getInitials(payerName)}
                              </span>
                              <span className="font-medium text-foreground">{payerName}</span>
                            </span>
                          </div>
                          {splits.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {splits.map((sp) => {
                                const name = sp.userId?.username ?? '—'
                                const share = parseFloat(sp.shareAmount) ?? 0
                                const pct = amount > 0 ? (share / amount) * 100 : 0
                                return (
                                  <div key={sp.userId?._id ?? sp.userId} className="flex items-center gap-1.5 text-xs">
                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-medium shrink-0 ${getAvatarColor(name)}`}>
                                      {getInitials(name)}
                                    </span>
                                    <span className="font-medium">{name}</span>
                                    <span className="text-muted-foreground">{formatMAD(share)}</span>
                                    <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                                      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, pct)}%` }} />
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </details>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function SettlementRowActions({
  settlementId,
  remaining,
  toName,
  onRequestPay,
  isPaying,
  t,
  formatMAD,
}) {
  const [partAmount, setPartAmount] = useState('')

  const handlePayAll = () => {
    onRequestPay(settlementId, null, toName, remaining)
  }
  const handlePayPart = () => {
    const num = parseFloat(partAmount)
    if (num > 0 && num <= remaining) {
      onRequestPay(settlementId, num, toName, remaining)
      setPartAmount('')
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Input
        type="number"
        min="0.01"
        step="0.01"
        max={remaining}
        placeholder={formatMAD(remaining)}
        value={partAmount}
        onChange={(e) => setPartAmount(e.target.value)}
        className="w-24 h-8 text-xs rounded-lg"
      />
      <Button
        size="sm"
        variant="outline"
        className="rounded-lg"
        onClick={handlePayPart}
        disabled={
          isPaying ||
          !partAmount ||
          parseFloat(partAmount) <= 0 ||
          parseFloat(partAmount) > remaining
        }
      >
        {t('settle.payPart')}
      </Button>
      <Button
        size="sm"
        className="rounded-lg font-medium bg-primary hover:bg-primary/90 text-primary-foreground"
        onClick={handlePayAll}
        disabled={isPaying || remaining < 0.01}
      >
        {t('settle.payAll')}
      </Button>
    </div>
  )
}

export default SettlePage
