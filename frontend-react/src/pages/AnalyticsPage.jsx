import { useMemo, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueries } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { formatCurrency, formatDate } from '../lib/utils'
import LoadingSpinner from '../components/ui/loading-spinner'
import api from '../lib/api'
import {
  Calendar,
  TrendingUp,
  DollarSign,
  Home,
  BarChart3,
  PieChart as PieChartIcon,
  Download,
  FileText,
  FileSpreadsheet,
  Printer,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'

const QUICK_FILTERS = [
  { value: '', labelKey: 'analytics.selectQuickFilter' },
  { value: '7', labelKey: 'analytics.last7Days' },
  { value: '30', labelKey: 'analytics.last30Days' },
  { value: '90', labelKey: 'analytics.last90Days' },
  { value: '365', labelKey: 'analytics.lastYear' },
]

const COLORS = ['#4CAF50', '#66BB6A', '#81C784', '#f59e0b', '#ef4444', '#8b5cf6']

const ALL_GROUPS_VALUE = '__all__'

function toISODate(d) {
  const x = new Date(d)
  return x.toISOString().slice(0, 10)
}

function getDefaultRange(days = 30) {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days)
  return { start: toISODate(start), end: toISODate(end) }
}

const AnalyticsPage = () => {
  const { t } = useTranslation()
  const defaultRange = useMemo(() => getDefaultRange(30), [])
  const [fromDate, setFromDate] = useState(defaultRange.start)
  const [toDate, setToDate] = useState(defaultRange.end)
  const [quickFilter, setQuickFilter] = useState('')
  const [appliedRange, setAppliedRange] = useState(defaultRange)
  const [selectedGroup, setSelectedGroup] = useState('')

  const { data: groupsRes } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const response = await api.get('/groups')
      const data = response.data?.data ?? response.data
      const list = Array.isArray(data?.groups) ? data.groups : []
      return { groups: list.filter((g) => g && (g._id || g.id)), pagination: data?.pagination ?? {} }
    },
  })

  const groups = Array.isArray(groupsRes?.groups) ? groupsRes.groups : []

  useEffect(() => {
    if (!selectedGroup && groups.length) {
      const g = groups[0]
      const firstId = g._id ?? g.id
      if (firstId) setSelectedGroup(String(firstId))
    }
  }, [groups, selectedGroup])

  const isAllGroups = selectedGroup === ALL_GROUPS_VALUE

  const { data: expensesRes, isLoading: expensesLoading } = useQuery({
    enabled: !!selectedGroup && selectedGroup !== ALL_GROUPS_VALUE && !!appliedRange?.start && !!appliedRange?.end,
    queryKey: ['analytics-expenses', selectedGroup, appliedRange.start, appliedRange.end],
    queryFn: async () => {
      const start = new Date(appliedRange.start).toISOString()
      const end = new Date(appliedRange.end).toISOString()
      const response = await api.get(
        `/expenses/${selectedGroup}?page=1&limit=1000&sortBy=createdAt&sortOrder=desc&startDate=${start}&endDate=${end}`
      )
      const data = response.data?.data ?? response.data
      return { expenses: Array.isArray(data?.expenses) ? data.expenses : [], ...data }
    },
  })

  const expensesPerGroupQueries = useQueries({
    enabled: groups.length > 0 && !!appliedRange?.start && !!appliedRange?.end,
    queries: groups.map((g) => {
      const gid = g._id || g.id
      return {
        queryKey: ['analytics-group-expenses', gid, appliedRange.start, appliedRange.end],
        queryFn: async () => {
          const start = new Date(appliedRange.start).toISOString()
          const end = new Date(appliedRange.end).toISOString()
          const response = await api.get(
            `/expenses/${gid}?page=1&limit=1000&sortBy=createdAt&sortOrder=desc&startDate=${start}&endDate=${end}`
          )
          const data = response.data?.data ?? response.data
          const expenses = Array.isArray(data?.expenses) ? data.expenses : []
          const total = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)
          return { groupId: gid, title: g.title || g.name || 'Group', expenses, total, currency: g.currency || 'USD' }
        },
      }
    }),
  })

  const expensesPerGroup = useMemo(() => {
    return expensesPerGroupQueries
      .filter((q) => q.data)
      .map((q) => ({ groupId: q.data.groupId, title: q.data.title, total: q.data.total, currency: q.data.currency }))
      .sort((a, b) => b.total - a.total)
  }, [expensesPerGroupQueries])

  const allGroupsLoading = isAllGroups && expensesPerGroupQueries.some((q) => q.isLoading)

  const allExpensesForAnalytics = useMemo(() => {
    if (selectedGroup !== ALL_GROUPS_VALUE) return null
    return expensesPerGroupQueries
      .filter((q) => q.data?.expenses?.length)
      .flatMap((q) => q.data.expenses)
  }, [selectedGroup, expensesPerGroupQueries])

  const analytics = useMemo(() => {
    const expenses =
      selectedGroup === ALL_GROUPS_VALUE
        ? (allExpensesForAnalytics ?? [])
        : (Array.isArray(expensesRes?.expenses) ? expensesRes.expenses : [])
    const amounts = expenses.map((e) => Number(e.amount) || 0).filter((n) => n > 0)
    const total = amounts.reduce((sum, n) => sum + n, 0)
    const count = amounts.length
    const average = count > 0 ? total / count : 0
    const max = amounts.length ? Math.max(...amounts) : 0
    const min = amounts.length ? Math.min(...amounts) : 0

    const byCategory = expenses.reduce((acc, e) => {
      const cat = e.category || 'General'
      acc[cat] = (acc[cat] || 0) + (e.amount || 0)
      return acc
    }, {})

    const byDate = expenses.reduce((acc, e) => {
      const d = e.expenseDate ? new Date(e.expenseDate) : new Date(e.createdAt)
      const key = toISODate(d)
      acc[key] = (acc[key] || 0) + (e.amount || 0)
      return acc
    }, {})

    const topCategories = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)

    const dailyData = Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({ date, amount, name: formatDate(date) }))

    const currency =
      selectedGroup === ALL_GROUPS_VALUE
        ? (groups[0]?.currency || 'USD')
        : (groups.find((g) => (g._id || g.id)?.toString?.() === selectedGroup || (g._id || g.id) === selectedGroup)?.currency || 'USD')

    return {
      total,
      count,
      average,
      max,
      min,
      byCategory,
      byDate,
      topCategories,
      dailyData,
      currency,
    }
  }, [expensesRes, selectedGroup, groups, allExpensesForAnalytics])

  const handleApplyFilter = () => {
    if (quickFilter) {
      const days = parseInt(quickFilter, 10)
      setAppliedRange(getDefaultRange(days))
      const range = getDefaultRange(days)
      setFromDate(range.start)
      setToDate(range.end)
    } else {
      setAppliedRange({ start: fromDate, end: toDate })
    }
  }

  const handleQuickFilterChange = (e) => {
    const value = e.target.value
    setQuickFilter(value)
    if (value) {
      const days = parseInt(value, 10)
      const range = getDefaultRange(days)
      setFromDate(range.start)
      setToDate(range.end)
    }
  }

  const downloadExpensesFile = async (filename) => {
    if (!selectedGroup || selectedGroup === ALL_GROUPS_VALUE) return
    try {
      const start = appliedRange.start
      const end = appliedRange.end
      const { data } = await api.get(
        `/expenses/${selectedGroup}/download?startDate=${start}&endDate=${end}`,
        { responseType: 'blob' }
      )
      const url = window.URL.createObjectURL(new Blob([data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed:', err)
    }
  }

  const handleExportPdf = () => {
    downloadExpensesFile(`expenses_${appliedRange.start}_${appliedRange.end}.xlsx`)
  }

  const handleExportCsv = () => {
    downloadExpensesFile(`expenses_${appliedRange.start}_${appliedRange.end}.xlsx`)
  }

  const handlePrint = () => {
    window.print()
  }

  if (!groups.length) {
    return (
      <div className="text-center py-16 space-y-4">
        <PieChartIcon className="h-16 w-16 text-muted-foreground mx-auto" />
        <p className="text-h2 text-foreground">{t('analytics.noGroups')}</p>
        <p className="text-muted-foreground">{t('analytics.createGroup')}</p>
      </div>
    )
  }

  const currency = analytics?.currency || 'USD'

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-h1 font-bold text-foreground">{t('analytics.title')}</h1>
        <p className="text-muted-foreground text-body mt-1">{t('analytics.subtitle')}</p>
      </div>

      {/* Filter by Date */}
      <Card className="rounded-2xl border-border/60 shadow-soft">
        <CardHeader className="pb-4">
          <CardTitle className="text-h2 flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            {t('analytics.filterByDate')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div className="space-y-2 lg:col-span-1">
              <label className="text-small font-medium text-foreground">{t('analytics.selectGroup')}</label>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="flex h-10 w-full rounded-2xl border border-input bg-background px-4 py-2 text-body"
              >
                <option value="">-- {t('analytics.selectGroup')} --</option>
                <option value={ALL_GROUPS_VALUE}>{t('analytics.allGroups')}</option>
                {groups.map((g) => (
                  <option key={g._id || g.id} value={g._id || g.id}>
                    {g.title || g.name || 'Group'}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-small font-medium text-foreground">{t('analytics.from')}</label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="rounded-2xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-small font-medium text-foreground">{t('analytics.to')}</label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="rounded-2xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-small font-medium text-foreground">
                {t('analytics.quickFilters')}
              </label>
              <select
                value={quickFilter}
                onChange={handleQuickFilterChange}
                className="flex h-10 w-full rounded-2xl border border-input bg-background px-4 py-2 text-body"
              >
                {QUICK_FILTERS.map((opt) => (
                  <option key={opt.value || 'none'} value={opt.value}>
                    {t(opt.labelKey)}
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={handleApplyFilter} className="rounded-2xl w-full sm:w-auto">
              {t('analytics.applyFilter')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {!selectedGroup ? (
        <div className="rounded-2xl border border-border/60 bg-card p-8 text-center">
          <p className="text-muted-foreground">{t('analytics.selectGroup')} above to view analytics.</p>
        </div>
      ) : (expensesLoading || allGroupsLoading) ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          {analytics && analytics.count === 0 && (
            <div className="rounded-2xl border border-border/60 bg-muted/30 px-4 py-3 text-center text-small text-muted-foreground">
              No expenses in this date range. Try a different range or add expenses in the Expenses page.
            </div>
          )}
          {/* Summary: Total, Average, Max, Min */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="rounded-2xl border-border/60 shadow-soft">
              <CardHeader className="pb-1">
                <CardTitle className="text-small font-medium text-muted-foreground">
                  {t('analytics.total')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-success">
                  {formatCurrency(analytics.total, currency)}
                </p>
                <p className="text-small text-muted-foreground mt-1">{analytics.count}</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-border/60 shadow-soft">
              <CardHeader className="pb-1">
                <CardTitle className="text-small font-medium text-muted-foreground">
                  {t('analytics.average')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-primary">
                  {formatCurrency(analytics.average, currency)}
                </p>
                <p className="text-small text-muted-foreground mt-1">{t('analytics.perExpense')}</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-border/60 shadow-soft">
              <CardHeader className="pb-1">
                <CardTitle className="text-small font-medium text-muted-foreground">
                  {t('analytics.max')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-destructive">
                  {formatCurrency(analytics.max, currency)}
                </p>
                <p className="text-small text-muted-foreground mt-1">—</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-border/60 shadow-soft">
              <CardHeader className="pb-1">
                <CardTitle className="text-small font-medium text-muted-foreground">
                  {t('analytics.min')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-secondary">
                  {formatCurrency(analytics.min, currency)}
                </p>
                <p className="text-small text-muted-foreground mt-1">—</p>
              </CardContent>
            </Card>
          </div>

          {/* Expenses per Group */}
          <Card className="rounded-2xl border-border/60 shadow-soft">
            <CardHeader>
              <CardTitle className="text-h2 flex items-center gap-2">
                <Home className="h-6 w-6 text-primary" />
                {t('analytics.expensesPerGroup')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-xl border border-border/60">
                <table className="w-full text-body">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left text-small font-semibold p-4">{t('analytics.group')}</th>
                      <th className="text-right text-small font-semibold p-4">{t('common.amount')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expensesPerGroup.map((row) => (
                      <tr
                        key={row.groupId}
                        className="border-b border-border/60 hover:bg-muted/20 transition-colors"
                      >
                        <td className="p-4 font-medium text-foreground">{row.title}</td>
                        <td className="p-4 text-right text-primary font-semibold">
                          {formatCurrency(row.total, row.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Expenses Trend */}
            <Card className="rounded-2xl border-border/60 shadow-soft">
              <CardHeader>
                <CardTitle className="text-h2 flex items-center gap-2">
                  <BarChart3 className="h-6 w-6 text-primary" />
                  {t('analytics.dailyExpensesTrend')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.dailyData?.length ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.dailyData}>
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}`} />
                        <Tooltip
                          formatter={(value) => [formatCurrency(value, currency), t('common.amount')]}
                          labelFormatter={(_, payload) =>
                            payload?.[0]?.payload?.date ? formatDate(payload[0].payload.date) : ''
                          }
                        />
                        <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-small py-8 text-center">
                    No daily data in range
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Expense Categories */}
            <Card className="rounded-2xl border-border/60 shadow-soft">
              <CardHeader>
                <CardTitle className="text-h2 flex items-center gap-2">
                  <PieChartIcon className="h-6 w-6 text-primary" />
                  {t('analytics.topCategories')}
                </CardTitle>
                <CardDescription>{t('analytics.spendingByCategory')}</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.topCategories?.length ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analytics.topCategories.map(([name, value]) => ({
                            name,
                            value,
                          }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) =>
                            `${name} ${(percent * 100).toFixed(0)}%`
                          }
                        >
                          {analytics.topCategories.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => formatCurrency(value, currency)}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-small py-8 text-center">
                    No categories in range
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Export Statistics */}
          <Card className="rounded-2xl border-border/60 shadow-soft">
            <CardHeader>
              <CardTitle className="text-h2 flex items-center gap-2">
                <Download className="h-6 w-6 text-primary" />
                {t('analytics.exportStatistics')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {isAllGroups ? (
                  <p className="text-small text-muted-foreground">
                    Select a single group above to export that group&apos;s expenses.
                  </p>
                ) : (
                  <>
                    <Button
                      variant="destructive"
                      className="rounded-2xl gap-2"
                      onClick={handleExportPdf}
                    >
                      <FileText className="h-4 w-4" />
                      {t('analytics.exportPdf')}
                    </Button>
                    <Button
                      variant="success"
                      className="rounded-2xl gap-2"
                      onClick={handleExportCsv}
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      {t('analytics.exportCsv')}
                    </Button>
                    <Button variant="default" className="rounded-2xl gap-2" onClick={handlePrint}>
                      <Printer className="h-4 w-4" />
                      {t('analytics.print')}
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

export default AnalyticsPage
