import { useEffect, useMemo, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { formatCurrency, formatDate, getInitials, getAvatarColor } from '../lib/utils'
import LoadingSpinner from '../components/ui/loading-spinner'
import api from '../lib/api'
import { 
  Plus, Search, Edit, Trash2, X, Check, Users, AlertCircle, 
  TrendingUp, TrendingDown, DollarSign, Calendar, Filter,
  BarChart3, PieChart as PieChartIcon, Sparkles, Zap, CheckCircle2
} from 'lucide-react'
import { useToast } from '../components/ui/use-toast'
import { useAuth } from '../contexts/AuthContext'
import { Dialog, DialogContent } from '../components/ui/dialog'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const itemsPerPage = 20

// Common expense categories with icons
const COMMON_CATEGORIES = [
  'Food & Dining', 'Transportation', 'Shopping', 'Entertainment', 
  'Bills & Utilities', 'Travel', 'Health & Fitness', 'Education',
  'General', 'Groceries', 'Restaurant', 'Gas', 'Rent', 'Insurance'
]

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#84cc16']

const ExpensesPage = () => {
  const { t } = useTranslation()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedGroup, setSelectedGroup] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [formGroupId, setFormGroupId] = useState('') // group used in add/edit form (can differ from selectedGroup)
  const [splitType, setSplitType] = useState('equal') // 'equal' or 'exact' (custom)
  const [customSplits, setCustomSplits] = useState([])
  const [showStats, setShowStats] = useState(true)
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
    category: 'General',
    note: '',
    expenseDate: new Date().toISOString().slice(0, 16),
    payerId: ''
  })
  const [splitAmongMemberIds, setSplitAmongMemberIds] = useState([])

  // Fetch groups
  const { data: groupsRes, isLoading: groupsLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      try {
        const response = await api.get('/groups')
        return response.data.data
      } catch (error) {
        console.error('Error fetching groups:', error)
        return { groups: [] }
      }
    },
    retry: 2
  })

  // Fetch group details
  const { data: groupDetails } = useQuery({
    enabled: !!selectedGroup,
    queryKey: ['group', selectedGroup],
    queryFn: async () => {
      try {
        const response = await api.get(`/groups/${selectedGroup}`)
        return response.data.data.group
      } catch (error) {
        console.error('Error fetching group details:', error)
        return null
      }
    },
    retry: 2
  })

  // Currency comes from the selected group (set when group is created)
  const groupCurrency = groupDetails?.currency || 'USD'

  // Group details for the form (when adding/editing, form can use a different group)
  const { data: formGroupDetails } = useQuery({
    enabled: !!formGroupId && showAddForm,
    queryKey: ['group', formGroupId],
    queryFn: async () => {
      try {
        const response = await api.get(`/groups/${formGroupId}`)
        return response.data.data.group
      } catch (error) {
        console.error('Error fetching form group details:', error)
        return null
      }
    },
    retry: 2
  })
  const formGroupCurrency = formGroupDetails?.currency || 'USD'
  const formGroupMembers = formGroupDetails?.members || []

  // Auto-select first group
  useEffect(() => {
    if (!selectedGroup && groupsRes?.groups?.length) {
      setSelectedGroup(groupsRes.groups[0]._id)
    }
  }, [groupsRes, selectedGroup])

  // Use form group details when form is open, else page group
  const activeGroupDetails = showAddForm && formGroupId ? formGroupDetails : groupDetails
  const activeGroupCurrency = showAddForm && formGroupId ? formGroupCurrency : groupCurrency

  const formMembers = formGroupId && showAddForm ? formGroupMembers : (groupDetails?.members || [])
  // When form opens or group changes: init splitAmongMemberIds to all members, payerId to current user
  useEffect(() => {
    if (!showAddForm || !formGroupId) return
    if (formGroupMembers.length) {
      const ids = formGroupMembers.map(m => m.userId._id || m.userId)
      setSplitAmongMemberIds(ids)
      setNewExpense(prev => ({ ...prev, payerId: prev.payerId || user?._id || ids[0] }))
    }
  }, [showAddForm, formGroupId, formGroupMembers.length, user?._id])

  useEffect(() => {
    if (splitType === 'equal') {
      setCustomSplits([])
      return
    }
    if (splitType === 'custom') {
      const selectedMembers = formMembers.filter(m => {
        const id = (m.userId?._id || m.userId)?.toString?.()
        return splitAmongMemberIds.some(sid => (sid?.toString?.() || sid) === id)
      })
      const total = parseFloat(newExpense.amount || editingExpense?.amount || 0)
      if (selectedMembers.length > 0 && total > 0) {
        const equalAmount = total / selectedMembers.length
        setCustomSplits(selectedMembers.map(m => ({
          userId: m.userId._id || m.userId,
          username: m.userId.username,
          shareAmount: equalAmount.toFixed(2)
        })))
      }
    }
  }, [splitType, splitAmongMemberIds])

  // Fetch expenses
  const { data: expensesRes, isLoading, isError, error, refetch: refetchExpenses } = useQuery({
    enabled: !!selectedGroup && selectedGroup.length > 0,
    queryKey: ['expenses', selectedGroup, currentPage, filterCategory],
    queryFn: async () => {
      try {
        if (!selectedGroup || !/^[0-9a-fA-F]{24}$/.test(selectedGroup)) {
          throw new Error('Invalid group ID')
        }
        
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: itemsPerPage.toString(),
          sortBy: 'createdAt',
          sortOrder: 'desc'
        })
        if (filterCategory) params.append('category', filterCategory)
        
        const response = await api.get(`/expenses/${selectedGroup}?${params}`)
        console.log('Expenses fetched:', response.data.data)
        return response.data.data
      } catch (error) {
        console.error('Error fetching expenses:', error)
        console.error('Error details:', {
          status: error.response?.status,
          data: error.response?.data,
          selectedGroup
        })
        throw error
      }
    },
    retry: (failureCount, error) => {
      // Don't retry on 400 errors (validation errors)
      if (error?.response?.status === 400) {
        return false
      }
      return failureCount < 2
    },
    refetchOnWindowFocus: false,
    staleTime: 0 // Always fetch fresh data
  })

  // Calculate statistics
  const statistics = useMemo(() => {
    const expenses = expensesRes?.expenses || []
    
    const totalSpent = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)
    const avgExpense = expenses.length > 0 ? totalSpent / expenses.length : 0
    
    // Category breakdown
    const categoryBreakdown = expenses.reduce((acc, e) => {
      const cat = e.category || 'General'
      acc[cat] = (acc[cat] || 0) + (parseFloat(e.amount) || 0)
      return acc
    }, {})
    
    const categoryData = Object.entries(categoryBreakdown)
      .map(([name, value]) => ({ name, value: parseFloat(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
    
    // Monthly breakdown (last 6 months)
    const monthlyData = expenses.reduce((acc, e) => {
      const date = new Date(e.createdAt)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      acc[monthKey] = (acc[monthKey] || 0) + (parseFloat(e.amount) || 0)
      return acc
    }, {})
    
    const monthlyChartData = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([name, value]) => ({
        name: new Date(name + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        amount: parseFloat(value)
      }))
    
    // Payer breakdown
    const payerBreakdown = expenses.reduce((acc, e) => {
      const payer = e.payerId?.username || 'Unknown'
      acc[payer] = (acc[payer] || 0) + (parseFloat(e.amount) || 0)
      return acc
    }, {})
    
    const payerData = Object.entries(payerBreakdown)
      .map(([name, value]) => ({ name, value: parseFloat(value) }))
      .sort((a, b) => b.value - a.value)
    
    return {
      totalSpent,
      avgExpense,
      totalCount: expenses.length,
      categoryData,
      monthlyChartData,
      payerData,
      currency: groupCurrency || expenses[0]?.currency || 'USD'
    }
  }, [expensesRes, groupCurrency])

  // Smart category suggestions
  const categorySuggestions = useMemo(() => {
    const expenses = expensesRes?.expenses || []
    const recentCategories = expenses
      .slice(0, 10)
      .map(e => e.category)
      .filter(Boolean)
    
    const uniqueRecent = [...new Set(recentCategories)]
    return [...uniqueRecent, ...COMMON_CATEGORIES.filter(c => !uniqueRecent.includes(c))].slice(0, 8)
  }, [expensesRes])

  // Add expense mutation
  const addExpenseMutation = useMutation({
    mutationFn: async () => {
      // Validate required fields
      if (!newExpense.description?.trim()) {
        throw new Error('Description is required')
      }
      if (!newExpense.amount || Number(newExpense.amount) <= 0) {
        throw new Error('Amount must be greater than 0')
      }
      const targetGroupId = formGroupId || selectedGroup
      if (!targetGroupId) {
        throw new Error('Please select a group')
      }
      
      // Validate groupId format (must be 24 hex characters)
      if (!/^[0-9a-fA-F]{24}$/.test(targetGroupId)) {
        throw new Error('Invalid group ID format')
      }
      
      // Ensure amount is a valid number
      const amountNum = parseFloat(newExpense.amount)
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error('Amount must be a positive number')
      }
      
      // Currency comes from the form group (set when group was created)
      const currency = (formGroupCurrency || 'USD').toUpperCase().trim().slice(0, 3) || 'USD'
      
      const payload = {
        description: newExpense.description.trim(),
        amount: amountNum,
        currency,
        category: (newExpense.category || 'General').trim(),
        groupId: targetGroupId,
        splitType: splitType === 'custom' ? 'exact' : 'equal',
        payerId: newExpense.payerId || user?._id,
      }
      if (splitType === 'equal' && splitAmongMemberIds.length > 0) {
        payload.splitMemberIds = splitAmongMemberIds.map(id => (id?.toString?.() || id))
      }
      
      // Add expense date if provided
      if (newExpense.expenseDate) {
        payload.expenseDate = new Date(newExpense.expenseDate).toISOString()
      }
      
      // Only add note if it exists
      if (newExpense.note?.trim()) {
        payload.note = newExpense.note.trim()
      }
      
      if (splitType === 'custom' && customSplits.length > 0) {
        const selectedIds = splitAmongMemberIds.map(id => (id?.toString?.() || id))
        const splitsToSend = customSplits.filter(s => selectedIds.includes((s.userId?.toString?.() || s.userId)))
        const total = amountNum
        const splitTotal = splitsToSend.reduce((sum, s) => sum + parseFloat(s.shareAmount || 0), 0)
        if (Math.abs(total - splitTotal) >= 0.01) {
          throw new Error('Split amounts must match the total amount')
        }
        payload.splits = splitsToSend
          .filter(s => s.userId && /^[0-9a-fA-F]{24}$/.test(s.userId?.toString?.() || s.userId))
          .map(s => ({ userId: s.userId, shareAmount: parseFloat(s.shareAmount) }))
        if (payload.splits.length === 0) {
          throw new Error('At least one valid split is required for custom split')
        }
      }
      
      console.log('📤 Creating expense with payload:', JSON.stringify(payload, null, 2))
      
      try {
        const response = await api.post('/expenses', payload)
        console.log('✅ Expense created successfully:', response.data)
        return response.data
      } catch (apiError) {
        console.error('❌ API call failed:', apiError)
        console.error('Request URL:', `${api.defaults.baseURL}/expenses`)
        console.error('Request payload:', JSON.stringify(payload, null, 2))
        console.error('Error response status:', apiError.response?.status)
        console.error('Error response data:', apiError.response?.data)
        throw apiError // Re-throw to be handled by onError
      }
    },
    onSuccess: () => {
      toast({
        title: t('expenses.added'),
        description: t('expenses.splitSuccess', { type: splitType === 'equal' ? t('expenses.equal') : t('expenses.custom') })
      })
      
      // Invalidate all expense queries (with any page/category combinations)
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      
      // Reset to first page to see the new expense
      setCurrentPage(1)
      
      // Invalidate related queries so Settle page shows new balances
      queryClient.invalidateQueries({ queryKey: ['balances'] })
      queryClient.invalidateQueries({ queryKey: ['all-groups-balances'] })
      queryClient.invalidateQueries({ queryKey: ['groupSettlements'] })
      queryClient.invalidateQueries({ queryKey: ['settlements'] })
      queryClient.invalidateQueries({ queryKey: ['group', selectedGroup] })
      
      // Force refetch to ensure new expense appears
      setTimeout(() => {
        queryClient.refetchQueries({ 
          queryKey: ['expenses', selectedGroup],
          exact: false // Refetch all variations
        })
      }, 300)
      
      resetForm()
    },
    onError: (err) => {
      console.error('=== EXPENSE CREATION ERROR ===', err)
      console.error('Error response:', err.response)
      console.error('Error response data:', err.response?.data)
      console.error('Error response status:', err.response?.status)
      
      let errorMessage = t('errors.unknownError')
      let errorTitle = t('expenses.addFailed')
      
      // Extract error message from response
      if (err.response?.data) {
        const errorData = err.response.data
        
        // Try to get the most specific error message
        if (errorData.message && errorData.message !== 'Validation error') {
          errorMessage = errorData.message
        } else if (errorData.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
          // Extract messages from errors array
          errorMessage = errorData.errors.map(e => {
            if (typeof e === 'string') return e
            if (e.message) return `${e.field || 'Field'}: ${e.message}`
            if (e.field) return `${e.field}: validation failed`
            return JSON.stringify(e)
          }).join('; ')
        } else if (errorData.error) {
          errorMessage = errorData.error
        } else if (errorData.message) {
          errorMessage = errorData.message
        }
        
        // Set title based on status
        if (err.response.status === 400) {
          errorTitle = t('errors.validationError')
        } else if (err.response.status === 403) {
          errorTitle = 'Authorization Error'
          if (!errorMessage || errorMessage === t('errors.unknownError')) {
            errorMessage = 'You are not authorized to perform this action'
          }
        } else if (err.response.status === 404) {
          errorTitle = 'Not Found'
          if (!errorMessage || errorMessage === t('errors.unknownError')) {
            errorMessage = 'Resource not found'
          }
        }
      } else if (err.message) {
        // Network or other errors
        errorMessage = err.message
        if (err.message.includes('Network') || err.message.includes('timeout')) {
          errorTitle = 'Connection Error'
        }
      }
      
      console.error('Final error message:', errorMessage)
      console.error('Payload that failed:', {
        description: newExpense.description,
        amount: newExpense.amount,
        category: newExpense.category,
        groupId: selectedGroup,
        splitType: splitType,
        customSplits: customSplits
      })
      
      toast({
        variant: 'destructive',
        title: errorTitle,
        description: errorMessage,
        duration: 5000 // Show for 5 seconds
      })
    }
  })

  // Update expense mutation
  const updateExpenseMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/expenses/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      toast({ 
        title: t('expenses.updated'),
        description: t('notifications.success')
      })
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['balances'] })
      queryClient.invalidateQueries({ queryKey: ['all-groups-balances'] })
      queryClient.invalidateQueries({ queryKey: ['groupSettlements'] })
      queryClient.invalidateQueries({ queryKey: ['settlements'] })
      queryClient.invalidateQueries({ queryKey: ['group', selectedGroup] })
      
      setTimeout(() => {
        queryClient.refetchQueries({ 
          queryKey: ['expenses', selectedGroup],
          exact: false
        })
      }, 300)
      
      setEditingExpense(null)
      resetForm()
    },
    onError: (err) => {
      let errorMessage = err.message || t('errors.unknownError')
      
      if (err.response?.data) {
        if (err.response.data.message) {
          errorMessage = err.response.data.message
        } else if (err.response.data.errors && Array.isArray(err.response.data.errors)) {
          errorMessage = err.response.data.errors.map(e => e.message || e.field).join(', ')
        } else if (err.response.data.error) {
          errorMessage = err.response.data.error
        }
      }
      
      console.error('Update expense error:', {
        status: err.response?.status,
        message: errorMessage,
        data: err.response?.data
      })
      
      toast({
        variant: 'destructive',
        title: err.response?.status === 400 ? t('errors.validationError') : t('expenses.updateFailed'),
        description: errorMessage
      })
    }
  })

  // Delete expense mutation
  const deleteExpenseMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/expenses/${id}`)
      return response.data
    },
    onSuccess: () => {
      toast({ 
        title: t('expenses.deleted'),
        description: t('notifications.success')
      })
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['balances'] })
      queryClient.invalidateQueries({ queryKey: ['all-groups-balances'] })
      queryClient.invalidateQueries({ queryKey: ['groupSettlements'] })
      queryClient.invalidateQueries({ queryKey: ['settlements'] })
      queryClient.invalidateQueries({ queryKey: ['group', selectedGroup] })
      
      setTimeout(() => {
        queryClient.refetchQueries({ 
          queryKey: ['expenses', selectedGroup],
          exact: false
        })
      }, 300)
    },
    onError: (err) => {
      let errorMessage = err.message || t('errors.unknownError')
      
      if (err.response?.data) {
        if (err.response.data.message) {
          errorMessage = err.response.data.message
        } else if (err.response.data.errors && Array.isArray(err.response.data.errors)) {
          errorMessage = err.response.data.errors.map(e => e.message || e.field).join(', ')
        } else if (err.response.data.error) {
          errorMessage = err.response.data.error
        }
      }
      
      console.error('Delete expense error:', {
        status: err.response?.status,
        message: errorMessage,
        data: err.response?.data
      })
      
      toast({
        variant: 'destructive',
        title: err.response?.status === 400 ? t('errors.validationError') : t('expenses.deleteFailed'),
        description: errorMessage
      })
    }
  })

  const resetForm = useCallback(() => {
    setNewExpense({
      description: '',
      amount: '',
      category: 'General',
      note: '',
      expenseDate: new Date().toISOString().slice(0, 16),
      payerId: ''
    })
    setSplitAmongMemberIds([])
    setSplitType('equal')
    setCustomSplits([])
    setShowAddForm(false)
    setEditingExpense(null)
  }, [])

  const handleEdit = useCallback((expense) => {
    setEditingExpense(expense)
    const groupId = expense.groupId?._id ?? expense.groupId
    setFormGroupId(groupId || selectedGroup)
    const expenseDate = expense.expenseDate 
      ? new Date(expense.expenseDate).toISOString().slice(0, 16)
      : expense.createdAt 
        ? new Date(expense.createdAt).toISOString().slice(0, 16)
        : new Date().toISOString().slice(0, 16)
    const payerId = expense.payerId?._id ?? expense.payerId
    setNewExpense({
      description: expense.description || '',
      amount: expense.amount?.toString() || '',
      category: expense.category || 'General',
      note: expense.note || '',
      expenseDate: expenseDate,
      payerId: payerId || user?._id
    })
    setSplitType(expense.splitType === 'exact' ? 'custom' : (expense.splitType || 'equal'))
    if (expense.splits && expense.splits.length > 0) {
      setSplitAmongMemberIds(expense.splits.map(s => s.userId?._id ?? s.userId))
      setCustomSplits(expense.splits.map(s => ({
        userId: s.userId._id || s.userId,
        username: s.userId?.username || 'Unknown',
        shareAmount: s.shareAmount?.toString() || '0'
      })))
    } else {
      setSplitAmongMemberIds([])
    }
    setShowAddForm(true)
  }, [selectedGroup, user?._id])

  // When editing and form members load, if splitAmongMemberIds is empty set to all members
  useEffect(() => {
    if (editingExpense && formGroupMembers.length > 0 && splitAmongMemberIds.length === 0) {
      setSplitAmongMemberIds(formGroupMembers.map(m => m.userId._id || m.userId))
    }
  }, [editingExpense, formGroupMembers, splitAmongMemberIds.length])

  const handleSave = useCallback(() => {
    // Validation
    if (!newExpense.description?.trim()) {
      toast({
        variant: 'destructive',
        title: t('errors.validationError'),
        description: t('expenses.description') + ' ' + t('errors.required')
      })
      return
    }
    
    if (!newExpense.amount || Number(newExpense.amount) <= 0) {
      toast({
        variant: 'destructive',
        title: t('errors.validationError'),
        description: t('expenses.amount') + ' ' + t('errors.mustBePositive')
      })
      return
    }
    
    if (splitType === 'custom' && !validateSplits()) {
      toast({
        variant: 'destructive',
        title: t('errors.validationError'),
        description: t('expenses.amountsDontMatch')
      })
      return
    }
    
    if (editingExpense) {
      const payload = {
        description: newExpense.description.trim(),
        amount: Number(newExpense.amount),
        currency: (activeGroupCurrency || 'USD').toUpperCase().trim().slice(0, 3) || 'USD',
        category: newExpense.category.trim() || 'General',
        splitType: splitType === 'custom' ? 'exact' : 'equal',
        note: newExpense.note?.trim() || '',
        payerId: newExpense.payerId || user?._id
      }
      const currentExpenseGroupId = editingExpense.groupId?._id ?? editingExpense.groupId
      if (formGroupId && formGroupId !== currentExpenseGroupId) {
        payload.groupId = formGroupId
      }
      if (newExpense.expenseDate) {
        payload.expenseDate = new Date(newExpense.expenseDate).toISOString()
      }
      if (splitType === 'equal' && splitAmongMemberIds.length > 0) {
        payload.splitMemberIds = splitAmongMemberIds.map(id => (id?.toString?.() || id))
      }
      if (splitType === 'custom' && customSplits.length > 0) {
        const selectedIds = splitAmongMemberIds.map(id => (id?.toString?.() || id))
        payload.splits = customSplits
          .filter(s => selectedIds.includes((s.userId?.toString?.() || s.userId)))
          .map(s => ({ userId: s.userId, shareAmount: Number(s.shareAmount) }))
      }
      updateExpenseMutation.mutate({ id: editingExpense._id, data: payload })
    } else {
      if (!formGroupId && !selectedGroup) {
        toast({
          variant: 'destructive',
          title: t('errors.validationError'),
          description: t('expenses.noGroupSelected')
        })
        return
      }
      addExpenseMutation.mutate()
    }
  }, [newExpense, splitType, customSplits, editingExpense, selectedGroup, formGroupId, addExpenseMutation, updateExpenseMutation, toast, t])

  const validateSplits = useCallback(() => {
    if (splitType === 'custom') {
      const total = parseFloat(newExpense.amount || editingExpense?.amount || 0)
      const splitTotal = customSplits.reduce((sum, s) => sum + parseFloat(s.shareAmount || 0), 0)
      return Math.abs(total - splitTotal) < 0.01
    }
    return true
  }, [splitType, newExpense.amount, editingExpense, customSplits])

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    let expenses = expensesRes?.expenses || []
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      expenses = expenses.filter((expense) =>
        expense.description?.toLowerCase().includes(term) ||
        expense.category?.toLowerCase().includes(term) ||
        expense.payerId?.username?.toLowerCase().includes(term) ||
        expense.note?.toLowerCase().includes(term)
      )
    }
    
    return expenses
  }, [expensesRes, searchTerm])

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set()
    expensesRes?.expenses?.forEach(e => {
      if (e.category) cats.add(e.category)
    })
    return Array.from(cats).sort()
  }, [expensesRes])

  const totalPages = expensesRes?.totalPages || 1

  // Loading state
  if (groupsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // No groups state
  if (!groupsRes?.groups?.length) {
    return (
      <div className="text-center py-16 space-y-4">
        <Users className="h-16 w-16 text-muted-foreground mx-auto opacity-50" />
        <p className="text-lg font-semibold">{t('expenses.noGroupSelected')}</p>
        <p className="text-muted-foreground">{t('expenses.createGroupToStart')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Error Banner */}
      {isError && (
        <Card className="border-red-200 bg-red-50 animate-in slide-in-from-top">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">
                  {t('errors.serverError')}
                </p>
                <p className="text-xs text-red-600 mt-1">
                  {error?.message || t('errors.unknownError')}
                </p>
              </div>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ['expenses', selectedGroup] })
                }}
              >
                {t('common.retry')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            {t('expenses.title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('expenses.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-sm text-muted-foreground whitespace-nowrap">{t('expenses.selectGroup')}</label>
          <select
            className="border rounded-md px-3 py-2 bg-background text-sm min-w-[150px] focus:outline-none focus:ring-2 focus:ring-primary"
            value={selectedGroup}
            onChange={(e) => {
              setSelectedGroup(e.target.value)
              setCurrentPage(1)
              setSearchTerm('')
              setFilterCategory('')
            }}
          >
            {groupsRes?.groups?.map((group) => (
              <option key={group._id} value={group._id}>
                {group.title}
              </option>
            ))}
          </select>
          <Button 
            onClick={() => {
              if (!showAddForm) setFormGroupId(selectedGroup)
              setShowAddForm(!showAddForm)
            }}
            className="shadow-lg hover:shadow-xl transition-shadow"
          >
            <Plus className="me-2 h-4 w-4" />
            {showAddForm ? t('common.cancel') : t('expenses.addExpense')}
          </Button>
        </div>
      </div>

      {/* Statistics Dashboard */}
      {showStats && expensesRes?.expenses?.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('expenses.totalSpent')}</p>
                  <p className="text-2xl font-bold mt-1">
                    {formatCurrency(statistics.totalSpent, statistics.currency)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('expenses.averageExpense')}</p>
                  <p className="text-2xl font-bold mt-1">
                    {formatCurrency(statistics.avgExpense, statistics.currency)}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('expenses.totalExpenses')}</p>
                  <p className="text-2xl font-bold mt-1">{statistics.totalCount}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('expenses.categories')}</p>
                  <p className="text-2xl font-bold mt-1">{statistics.categoryData.length}</p>
                </div>
                <PieChartIcon className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Section */}
      {showStats && expensesRes?.expenses?.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Monthly Spending Chart */}
          {statistics.monthlyChartData.length > 0 && (
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  {t('expenses.monthlySpending')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={statistics.monthlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => formatCurrency(value, statistics.currency)}
                      contentStyle={{ borderRadius: '8px' }}
                    />
                    <Bar dataKey="amount" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Category Breakdown Chart */}
          {statistics.categoryData.length > 0 && (
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5 text-primary" />
                  {t('expenses.categoryBreakdown')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={statistics.categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statistics.categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => formatCurrency(value, statistics.currency)}
                      contentStyle={{ borderRadius: '8px' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Add/Edit Form - popup on desktop */}
      <Dialog open={showAddForm} onOpenChange={(open) => { setShowAddForm(open); if (!open) setEditingExpense(null) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
          <Card className="border-0 shadow-none">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-purple-500/10 flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  {editingExpense ? t('expenses.editExpense') : t('expenses.addExpense')}
                </CardTitle>
                <CardDescription className="mt-1">
                  {splitType === 'equal' ? (
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {t('expenses.equal')} split among {formGroupMembers?.length || activeGroupDetails?.members?.length || 0} members
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Zap className="h-4 w-4" />
                      {t('expenses.custom')} split
                    </span>
                  )}
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-full" onClick={resetForm} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Group selector: choose which group this expense belongs to (add or move when editing) */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {t('expenses.selectGroup')}
                </label>
                <select
                  value={formGroupId}
                  onChange={(e) => setFormGroupId(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary min-w-[200px]"
                >
                  {groupsRes?.groups?.map((g) => (
                    <option key={g._id} value={g._id}>{g.title}</option>
                  ))}
                </select>
                {editingExpense && (
                  <p className="text-xs text-muted-foreground">
                    Change group to move this expense to another group. Splits will be recalculated for the new group.
                  </p>
                )}
              </div>
              {/* Paid by */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  {t('expenses.paidBy', 'Paid by')}
                </label>
                <select
                  value={(newExpense.payerId?._id ?? newExpense.payerId) || user?._id || ''}
                  onChange={(e) => setNewExpense({ ...newExpense, payerId: e.target.value || user?._id })}
                  className="w-full border rounded-md px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary min-w-[200px]"
                >
                  {(formGroupMembers?.length ? formGroupMembers : activeGroupDetails?.members || []).map((m) => {
                    const id = m.userId._id || m.userId
                    const name = m.userId?.username || 'Unknown'
                    return (
                      <option key={id} value={id}>
                        {name} {id === user?._id ? '(you)' : ''}
                      </option>
                    )
                  })}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  {t('expenses.description')} <span className="text-red-500">*</span>
                </label>
                <Input
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  placeholder={t('expenses.description')}
                  className="focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  {t('expenses.amount')} <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={newExpense.amount}
                  onChange={(e) => {
                    const amount = e.target.value
                    setNewExpense({ ...newExpense, amount })
                    if (splitType === 'custom') {
                      const membersList = formGroupMembers?.length ? formGroupMembers : (activeGroupDetails?.members || [])
                      const selected = membersList.filter(m =>
                        splitAmongMemberIds.some(sid => (sid?.toString?.() || sid) === ((m.userId._id || m.userId)?.toString?.() || m.userId._id))
                      )
                      const total = parseFloat(amount || 0)
                      if (total > 0 && selected.length) {
                        const equalAmount = total / selected.length
                        setCustomSplits(selected.map(m => ({
                          userId: m.userId._id || m.userId,
                          username: m.userId.username,
                          shareAmount: equalAmount.toFixed(2)
                        })))
                      }
                    }
                  }}
                  placeholder="0.00"
                  className="focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('expenses.category')}</label>
                <div className="space-y-2">
                  <select
                    value={COMMON_CATEGORIES.includes(newExpense.category) ? newExpense.category : 'Other'}
                    onChange={(e) => {
                      const v = e.target.value
                      setNewExpense({ ...newExpense, category: v === 'Other' ? (newExpense.category && !COMMON_CATEGORIES.includes(newExpense.category) ? newExpense.category : '') : v })
                    }}
                    className="w-full border rounded-md px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {COMMON_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="Other">Other</option>
                  </select>
                  {(COMMON_CATEGORIES.includes(newExpense.category) ? false : true) && (
                    <Input
                      value={newExpense.category}
                      onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                      placeholder="Type custom category"
                      className="focus:ring-2 focus:ring-primary"
                    />
                  )}
                </div>
                {/* Quick category chips */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {categorySuggestions.slice(0, 6).map(cat => (
                    <Button
                      key={cat}
                      type="button"
                      variant={newExpense.category === cat ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setNewExpense({ ...newExpense, category: cat })}
                      className="text-xs"
                    >
                      {cat}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Date & Time
                </label>
                <Input
                  type="datetime-local"
                  value={newExpense.expenseDate}
                  onChange={(e) => setNewExpense({ ...newExpense, expenseDate: e.target.value })}
                  className="focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">{t('expenses.note')}</label>
                <Input
                  value={newExpense.note}
                  onChange={(e) => setNewExpense({ ...newExpense, note: e.target.value })}
                  placeholder={t('expenses.notePlaceholder')}
                  className="focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Split among: who is included in the split */}
            {newExpense.amount && (formGroupMembers?.length || activeGroupDetails?.members?.length) && (
              <div className="space-y-3 pt-4 border-t">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {t('expenses.splitAmong', 'Split among')}
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSplitAmongMemberIds((formGroupMembers?.length ? formGroupMembers : activeGroupDetails?.members || []).map(m => m.userId._id || m.userId))}
                  >
                    {t('expenses.selectAll', 'Select all')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSplitAmongMemberIds([])}
                  >
                    {t('expenses.deselectAll', 'Deselect all')}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(formGroupMembers?.length ? formGroupMembers : activeGroupDetails?.members || []).map((member) => {
                    const id = member.userId._id || member.userId
                    const isSelected = splitAmongMemberIds.some(sid => (sid?.toString?.() || sid) === (id?.toString?.() || id))
                    return (
                      <label
                        key={id}
                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                          isSelected ? 'bg-primary/10 border-primary' : 'bg-muted/30 border-border hover:bg-muted/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSplitAmongMemberIds(prev => [...prev.filter(sid => (sid?.toString?.() || sid) !== (id?.toString?.() || id)), id])
                            } else {
                              setSplitAmongMemberIds(prev => prev.filter(sid => (sid?.toString?.() || sid) !== (id?.toString?.() || id)))
                            }
                          }}
                          className="rounded border-primary"
                        />
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium shrink-0 ${getAvatarColor(member.userId.username)}`}>
                          {getInitials(member.userId.username)}
                        </span>
                        <span className="text-sm font-medium">{member.userId.username}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Split Type Selection */}
            {newExpense.amount && (formGroupMembers?.length || groupDetails?.members?.length) && (
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">{t('expenses.splitType')}</label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={splitType === 'equal' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSplitType('equal')}
                      className="transition-all"
                    >
                      <Users className="me-2 h-4 w-4" />
                      {t('expenses.equal')}
                    </Button>
                    <Button
                      type="button"
                      variant={splitType === 'custom' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSplitType('custom')}
                      className="transition-all"
                    >
                      <Zap className="me-2 h-4 w-4" />
                      {t('expenses.custom')}
                    </Button>
                  </div>
                </div>

                {/* Visual split preview */}
                {parseFloat(newExpense.amount || 0) > 0 && splitAmongMemberIds.length > 0 && (() => {
                  const total = parseFloat(newExpense.amount || 0)
                  const membersList = formGroupMembers?.length ? formGroupMembers : (activeGroupDetails?.members || [])
                  const selectedMembers = membersList.filter(m =>
                    splitAmongMemberIds.some(sid => (sid?.toString?.() || sid) === ((m.userId._id || m.userId)?.toString?.() || m.userId._id))
                  )
                  const previewRows = splitType === 'equal'
                    ? selectedMembers.map(m => ({
                        id: m.userId._id || m.userId,
                        name: m.userId?.username || '—',
                        share: total / Math.max(1, selectedMembers.length)
                      }))
                    : customSplits
                        .filter(s => splitAmongMemberIds.some(sid => (sid?.toString?.() || sid) === (s.userId?.toString?.() || s.userId)))
                        .map(s => ({
                          id: s.userId,
                          name: s.username || '—',
                          share: parseFloat(s.shareAmount || 0)
                        }))
                  return (
                    <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">{t('expenses.splitPreview', 'Split preview')}</p>
                      <div className="space-y-2">
                        {previewRows.map((row) => {
                          const pct = total > 0 ? (row.share / total) * 100 : 0
                          return (
                            <div key={row.id} className="flex items-center gap-2">
                              <div className="flex-1 flex items-center gap-2 min-w-0">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium shrink-0 bg-primary/80">
                                  {getInitials(row.name)}
                                </div>
                                <span className="text-sm font-medium truncate">{row.name}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, pct)}%` }} />
                                </div>
                                <span className="text-sm font-semibold w-16 text-right">{formatCurrency(row.share, activeGroupCurrency)}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}

                {/* Custom Split Editor */}
                {splitType === 'custom' && (
                  <div className="space-y-2 max-h-60 overflow-y-auto p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-muted-foreground">
                        {t('expenses.total')}: <strong>{formatCurrency(parseFloat(newExpense.amount || 0), activeGroupCurrency)}</strong>
                      </span>
                      <span className={`font-medium ${validateSplits() ? 'text-green-600' : 'text-red-600'}`}>
                        {t('expenses.split')}: {formatCurrency(customSplits.reduce((sum, s) => sum + parseFloat(s.shareAmount || 0), 0), activeGroupCurrency)}
                        {!validateSplits() && (
                          <span className="ms-2">⚠ {t('expenses.amountsDontMatch')}</span>
                        )}
                        {validateSplits() && (
                          <CheckCircle2 className="inline h-4 w-4 ms-1" />
                        )}
                      </span>
                    </div>
                    {(formGroupMembers?.length ? formGroupMembers : activeGroupDetails?.members || [])
                      .filter(m => splitAmongMemberIds.some(sid => (sid?.toString?.() || sid) === ((m.userId._id || m.userId)?.toString?.() || m.userId._id)))
                      .map((member) => {
                        const mid = member.userId._id || member.userId
                        const split = customSplits.find(s => (s.userId?.toString?.() || s.userId) === (mid?.toString?.() || mid))
                        return (
                          <div key={mid} className="flex items-center gap-3 p-2 border rounded-lg bg-background hover:bg-accent transition-colors">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium ${getAvatarColor(member.userId.username)}`}>
                              {getInitials(member.userId.username)}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{member.userId.username}</p>
                            </div>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              className="w-28"
                              value={split?.shareAmount || '0.00'}
                              onChange={(e) => {
                                const updated = customSplits.filter(s => (s.userId?.toString?.() || s.userId) !== (mid?.toString?.() || mid))
                                updated.push({
                                  userId: mid,
                                  username: member.userId.username,
                                  shareAmount: e.target.value
                                })
                                setCustomSplits(updated)
                              }}
                            />
                          </div>
                        )
                      })}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSave}
                disabled={
                  !newExpense.description?.trim() || 
                  !newExpense.amount || 
                  Number(newExpense.amount) <= 0 ||
                  splitAmongMemberIds.length === 0 ||
                  (splitType === 'custom' && !validateSplits()) ||
                  addExpenseMutation.isLoading ||
                  updateExpenseMutation.isLoading
                }
                className="flex-1 shadow-lg hover:shadow-xl transition-shadow"
              >
                {addExpenseMutation.isLoading || updateExpenseMutation.isLoading ? (
                  <>
                    <LoadingSpinner size="sm" className="me-2" />
                    {t('common.loading')}
                  </>
                ) : (
                  <>
                    <Check className="me-2 h-4 w-4" />
                    {editingExpense ? t('common.save') : t('expenses.addExpense')}
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={resetForm} className="shadow-lg hover:shadow-xl transition-shadow">
                <X className="me-2 h-4 w-4" />
                {t('common.cancel')}
              </Button>
            </div>
          </CardContent>
        </Card>
        </DialogContent>
      </Dialog>

      {/* Expenses List */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('expenses.title')}</CardTitle>
              <CardDescription>
                {expensesRes?.totalExpenses || 0} {t('expenses.title').toLowerCase()} found
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowStats(!showStats)}
            >
              {showStats ? <BarChart3 className="h-4 w-4" /> : <BarChart3 className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('expenses.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="ps-10 focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex gap-2">
              <select
                className="border rounded-md px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary min-w-[150px]"
                value={filterCategory}
                onChange={(e) => {
                  setFilterCategory(e.target.value)
                  setCurrentPage(1)
                }}
              >
                <option value="">{t('expenses.allCategories')}</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Expenses List */}
          <div className="space-y-2">
            {isLoading && !expensesRes ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : filteredExpenses.length > 0 ? (
              filteredExpenses
                .filter(e => !filterCategory || e.category === filterCategory)
                .map((expense) => (
                  <div 
                    key={expense._id} 
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-all hover:shadow-md group animate-in fade-in"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary to-purple-600 rounded-full flex items-center justify-center shadow-md">
                          <span className="text-white font-bold text-sm">
                            {expense.category?.charAt(0)?.toUpperCase() || 'E'}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-base">{expense.description}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                            <span>{expense.category || 'General'}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(expense.expenseDate || expense.createdAt)}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              {expense.splitType === 'equal' ? <Users className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
                              {expense.splitType === 'exact' ? 'custom' : (expense.splitType || 'equal')}
                            </span>
                          </p>
                          {expense.note && (
                            <p className="text-xs text-muted-foreground mt-1 italic">"{expense.note}"</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-end">
                        <p className="font-bold text-lg">
                          {formatCurrency(expense.amount, expense.currency)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Paid by {expense.payerId?.username || 'Unknown'}
                        </p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(expense)}
                          className="hover:bg-primary/10"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm(t('expenses.confirmDelete'))) {
                              deleteExpenseMutation.mutate(expense._id)
                            }
                          }}
                          className="hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
            ) : (
              <div className="text-center py-12">
                <DollarSign className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-lg font-semibold mb-2">{t('expenses.noResults')}</p>
                <p className="text-sm text-muted-foreground mb-6">
                  {searchTerm || filterCategory 
                    ? 'Try adjusting your search or filters'
                    : 'Start by adding your first expense'}
                </p>
                {!searchTerm && !filterCategory && (
                  <Button onClick={() => setShowAddForm(true)} className="shadow-lg">
                    <Plus className="me-2 h-4 w-4" />
                    {t('expenses.createFirstExpense')}
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages} • {filteredExpenses.length} {t('common.shown')}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  {t('common.previous')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  {t('common.next')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ExpensesPage
