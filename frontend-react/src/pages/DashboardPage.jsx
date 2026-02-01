import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { formatCurrency, formatDate } from '../lib/utils'
import LoadingSpinner from '../components/ui/loading-spinner'
import api from '../lib/api'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  UserPlus, 
  Receipt,
  MessageSquare,
  CreditCard,
  ArrowRight,
  Plus,
  CheckCircle2
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const DashboardPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [focusGroupId, setFocusGroupId] = useState(null)

  const { data: groupsRes, isLoading: groupsLoading, error: groupsError } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const response = await api.get('/groups')
      return response.data.data
    },
    retry: 1
  })

  const { data: friendsRes, isLoading: friendsLoading, error: friendsError } = useQuery({
    queryKey: ['friends'],
    queryFn: async () => {
      const response = await api.get('/friends/my')
      return response.data
    },
    retry: 1
  })

  // Fetch balances for all groups to calculate totals
  const { data: allGroupsBalances } = useQuery({
    enabled: !!groupsRes?.groups?.length,
    queryKey: ['all-groups-balances', groupsRes?.groups?.map(g => g._id).join(',')],
    queryFn: async () => {
      const balances = {}
      if (!groupsRes?.groups) return balances
      
      await Promise.all(
        groupsRes.groups.map(async (group) => {
          try {
            const response = await api.get(`/settle/${group._id}/balances`)
            balances[group._id] = response.data.data.balances || []
          } catch (error) {
            balances[group._id] = []
          }
        })
      )
      return balances
    }
  })

  useEffect(() => {
    if (!focusGroupId && groupsRes?.groups?.length) {
      setFocusGroupId(groupsRes.groups[0]._id)
    }
  }, [focusGroupId, groupsRes])

  const { data: expensesRes, isLoading: expensesLoading } = useQuery({
    enabled: !!focusGroupId,
    queryKey: ['dashboard-expenses', focusGroupId],
    queryFn: async () => {
      const response = await api.get(`/expenses/${focusGroupId}?page=1&limit=5&sortBy=createdAt&sortOrder=desc`)
      return response.data.data
    }
  })

  const loading = groupsLoading || friendsLoading || expensesLoading
  const hasError = groupsError || friendsError

  // Calculate summary totals
  const summaryTotals = useMemo(() => {
    if (!allGroupsBalances || !groupsRes?.groups) return { totalOwe: 0, totalOwed: 0, netBalance: 0 }

    let totalOwe = 0
    let totalOwed = 0
    const currentUserId = user?._id?.toString()
    
    groupsRes.groups.forEach(group => {
      const balances = allGroupsBalances[group._id] || []
      const userBalance = balances.find(b => {
        const userId = b.userId?._id?.toString() || b.userId?.toString() || b.userId
        return userId === currentUserId
      })
      const balance = parseFloat(userBalance?.balance || 0)
      
      if (balance < 0) totalOwe += Math.abs(balance)
      if (balance > 0) totalOwed += balance
    })

    return { 
      totalOwe, 
      totalOwed, 
      netBalance: totalOwed - totalOwe 
    }
  }, [allGroupsBalances, groupsRes, user])

  const formatMAD = (amount) => formatCurrency(amount || 0, 'MAD')

  if (hasError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t('dashboard.title')}</h1>
          <p className="text-muted-foreground">
            {t('dashboard.subtitle')}
          </p>
        </div>
        <Card className="rounded-xl border-border shadow-soft">
          <CardContent className="text-center py-12">
            <p className="text-destructive mb-4">{t('errors.serverError')}</p>
            <Button 
              className="rounded-xl font-medium mt-4" 
              onClick={() => window.location.reload()}
            >
              {t('common.retry')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const quickActions = [
    {
      icon: Receipt,
      titleKey: 'dashboard.addExpense',
      descKey: 'dashboard.addExpenseDesc',
      onClick: () => navigate('/expenses'),
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: Users,
      titleKey: 'dashboard.createGroup',
      descKey: 'dashboard.createGroupDesc',
      onClick: () => navigate('/groups'),
      color: 'from-indigo-500 to-indigo-600'
    },
    {
      icon: CreditCard,
      titleKey: 'dashboard.settleUp',
      descKey: 'dashboard.settleUpDesc',
      onClick: () => navigate('/settle'),
      color: 'from-green-500 to-green-600'
    },
    {
      icon: MessageSquare,
      titleKey: 'dashboard.groupChat',
      descKey: 'dashboard.groupChatDesc',
      onClick: () => navigate('/chat'),
      color: 'from-purple-500 to-purple-600'
    }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Handle case when no groups exist
  if (!groupsRes?.groups?.length) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            {t('dashboard.title')}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {t('dashboard.subtitle')}
          </p>
        </div>
        <Card className="rounded-xl border border-dashed border-border">
          <CardContent className="text-center py-16">
            <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">{t('dashboard.noGroups')}</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto text-sm leading-relaxed">
              {t('dashboard.createFirstGroup')}
            </p>
            <Button onClick={() => navigate('/groups')} className="rounded-xl font-medium">
              <Plus className="me-2 h-4 w-4" />
              {t('dashboard.createGroup')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
          {t('dashboard.title')}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">
          {t('dashboard.subtitle')}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <Card className="rounded-xl border border-border shadow-soft border-l-4 border-l-destructive hover:shadow-soft-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.youOwe')}</CardTitle>
            <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">
              {formatMAD(summaryTotals.totalOwe)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('dashboard.youOweDesc')}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border shadow-soft border-l-4 border-l-green-500 dark:border-l-green-600 hover:shadow-soft-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.youShouldReceive')}</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {formatMAD(summaryTotals.totalOwed)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('dashboard.youShouldReceiveDesc')}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border shadow-soft border-l-4 border-l-primary hover:shadow-soft-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.netBalance')}</CardTitle>
            <DollarSign className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${
              summaryTotals.netBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {formatMAD(summaryTotals.netBalance)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summaryTotals.netBalance >= 0 ? t('dashboard.netBalanceDescOwed') : t('dashboard.netBalanceDescOwe')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">{t('dashboard.quickActions')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Card 
              key={index}
              className="rounded-xl border border-border shadow-soft hover:border-primary/50 dark:hover:border-primary/40 hover:shadow-soft-lg transition-all cursor-pointer group"
              onClick={action.onClick}
            >
              <CardContent className="p-5 sm:p-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <action.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">{t(action.titleKey)}</h3>
                <p className="text-sm text-muted-foreground">{t(action.descKey)}</p>
                <ArrowRight className="h-4 w-4 text-muted-foreground mt-3 group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Expenses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              {t('dashboard.recentExpenses')}
            </CardTitle>
            <CardDescription>
              {t('dashboard.recentExpensesDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expensesRes?.expenses?.length ? (
                expensesRes.expenses.map((expense) => (
                  <div 
                    key={expense._id} 
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 sm:p-4 rounded-xl border border-border hover:border-primary/40 dark:hover:border-primary/50 hover:shadow-md transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{expense.description}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1 flex-wrap">
                        <span>{formatDate(expense.createdAt)}</span>
                        <span>•</span>
                        <span>{expense.category}</span>
                      </p>
                    </div>
                    <div className="text-start sm:text-end shrink-0">
                      <p className="font-bold text-lg">
                        {formatCurrency(expense.amount, expense.currency || 'MAD')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        by {expense.payerId?.username || t('common.unknown')}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">
                    {t('expenses.noExpenses')}
                  </p>
                </div>
              )}
            </div>
            {expensesRes?.expenses?.length > 0 && (
              <Button 
                variant="outline" 
                className="w-full mt-4 rounded-xl"
                onClick={() => navigate('/expenses')}
              >
                {t('dashboard.viewAllExpenses')}
                <ArrowRight className="ms-2 h-4 w-4" />
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Stats Overview */}
        <Card className="rounded-xl border border-border shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {t('dashboard.overview')}
            </CardTitle>
            <CardDescription>
              {t('dashboard.accountSummary')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-primary/10 dark:bg-primary/20 border border-primary/20 dark:border-primary/30">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 dark:bg-primary/30 flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{t('dashboard.groupsLabel')}</p>
                    <p className="text-sm text-muted-foreground">{t('dashboard.groupsDesc')}</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-primary">
                  {groupsRes?.groups?.length || 0}
                </p>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 dark:bg-secondary border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-secondary dark:bg-secondary/80 flex items-center justify-center">
                    <UserPlus className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{t('dashboard.friendsLabel')}</p>
                    <p className="text-sm text-muted-foreground">{t('dashboard.friendsDesc')}</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-primary">
                  {friendsRes?.length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default DashboardPage
