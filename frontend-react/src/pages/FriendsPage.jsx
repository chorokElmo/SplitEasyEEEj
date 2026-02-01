import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import LoadingSpinner from '../components/ui/loading-spinner'
import api from '../lib/api'
import { 
  UserPlus, 
  Search, 
  Check, 
  X, 
  Clock, 
  Users, 
  User, 
  Trash2, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  Mail,
  Calendar
} from 'lucide-react'
import { getInitials, getAvatarColor, formatDate } from '../lib/utils'
import { useToast } from '../components/ui/use-toast'

const FriendsPage = () => {
  const { t } = useTranslation()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('friends')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch friends
  const { data: friends, isLoading: friendsLoading, error: friendsError } = useQuery({
    queryKey: ['friends'],
    queryFn: async () => {
      try {
        const response = await api.get('/friends/my')
        return Array.isArray(response.data) ? response.data : (response.data?.data || [])
      } catch (error) {
        console.error('Error fetching friends:', error)
        return []
      }
    },
    retry: 1
  })

  // Fetch received requests
  const { data: receivedRequests, isLoading: requestsLoading, error: receivedError } = useQuery({
    queryKey: ['friend-requests-received'],
    queryFn: async () => {
      try {
        const response = await api.get('/friends/requests/received')
        return Array.isArray(response.data) ? response.data : (response.data?.data || [])
      } catch (error) {
        console.error('Error fetching received requests:', error)
        return []
      }
    },
    retry: 1
  })

  // Fetch sent requests
  const { data: sentRequests, error: sentError } = useQuery({
    queryKey: ['friend-requests-sent'],
    queryFn: async () => {
      try {
        const response = await api.get('/friends/requests/sent')
        return Array.isArray(response.data) ? response.data : (response.data?.data || [])
      } catch (error) {
        console.error('Error fetching sent requests:', error)
        return []
      }
    },
    retry: 1
  })

  // Search mutation
  const searchMutation = useMutation({
    mutationFn: async (query) => {
      // Validate query before sending
      if (!query || query.trim().length < 2) {
        throw new Error('Search query must be at least 2 characters')
      }
      const response = await api.get(`/friends/search?query=${encodeURIComponent(query.trim())}`)
      // Handle different response formats
      const data = response.data?.data || response.data
      const users = Array.isArray(data) ? data : []
      
      // Ensure all users have valid _id as string
      try {
        return users
          .filter(user => user != null) // Filter out null/undefined
          .map(user => {
            try {
              let id = user._id || user.id
              
              // Convert to string if needed
              if (id != null) {
                if (typeof id === 'object' && id.toString) {
                  id = id.toString()
                } else if (typeof id !== 'string') {
                  id = String(id)
                }
              }
              
              return {
                ...user,
                _id: id,
                id: id
              }
            } catch (err) {
              console.warn('Error processing user:', user, err)
              return null
            }
          })
          .filter(user => {
            if (!user) return false
            const id = user._id || user.id
            if (!id) return false
            const idStr = typeof id === 'string' ? id : String(id)
            return /^[0-9a-fA-F]{24}$/.test(idStr)
          })
      } catch (error) {
        console.error('Error processing search results:', error)
        return []
      }
    },
    onSuccess: (data) => {
      setSearchResults(Array.isArray(data) ? data : [])
      setIsSearching(false)
    },
    onError: (err) => {
      const errorMessage = err.response?.data?.message || err.message || t('friends.searchFailed')
      toast({
        variant: 'destructive',
        title: t('friends.searchFailed'),
        description: errorMessage
      })
      setSearchResults([])
      setIsSearching(false)
    }
  })

  // Debounced search
  useEffect(() => {
    if (searchTerm.trim().length >= 2) {
      setIsSearching(true)
      const timeoutId = setTimeout(() => {
        searchMutation.mutate(searchTerm.trim())
      }, 500)

      return () => {
        clearTimeout(timeoutId)
        setIsSearching(false)
      }
    } else {
      setSearchResults([])
      setIsSearching(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm])

  // Helper function to extract valid ID
  const getValidId = (item) => {
    if (!item) {
      console.warn('getValidId: item is null or undefined')
      return null
    }
    
    // Try different possible ID fields
    let id = item._id || item.id || item.friendship_id || item.requestId
    
    // If id is an object (MongoDB ObjectId), convert to string
    if (id && typeof id === 'object') {
      if (id.toString && typeof id.toString === 'function') {
        id = id.toString()
      } else if (id._id) {
        id = id._id
      } else {
        console.warn('getValidId: ID is an object but cannot be converted:', id)
        return null
      }
    }
    
    // Ensure it's a string
    if (typeof id !== 'string') {
      console.warn('getValidId: ID is not a string:', typeof id, id)
      return null
    }
    
    // Trim whitespace
    id = id.trim()
    
    // Ensure it's a valid MongoDB ObjectId format (24 hex characters)
    if (/^[0-9a-fA-F]{24}$/.test(id)) {
      return id
    }
    
    console.warn('getValidId: ID does not match ObjectId format:', id, 'Item:', item)
    return null
  }

  // Friend actions mutation
  const friendActionMutation = useMutation({
    mutationFn: async ({ type, id, item }) => {
      // Use the provided id or extract from item
      const validId = id || getValidId(item)
      
      if (!validId) {
        console.error('Invalid ID provided:', { type, id, item })
        throw new Error('Invalid ID provided. Please try again.')
      }
      
      // Double-check the ID format before sending
      if (!/^[0-9a-fA-F]{24}$/.test(validId)) {
        console.error('ID does not match ObjectId format:', validId)
        throw new Error('Invalid ID format. Please try again.')
      }
      
      console.log(`Sending ${type} request with ID:`, validId)

      switch (type) {
        case 'add':
          return api.post(`/friends/request/${validId}`)
        case 'accept':
          return api.post(`/friends/request/${validId}/accept`)
        case 'reject':
          return api.post(`/friends/request/${validId}/reject`)
        case 'cancel':
          return api.post(`/friends/request/${validId}/cancel`)
        case 'remove':
          return api.delete(`/friends/remove/${validId}`)
        default:
          throw new Error('Unknown action')
      }
    },
    onSuccess: (_, variables) => {
      const messages = {
        add: t('friends.requestSent'),
        accept: t('friends.requestAccepted'),
        reject: t('friends.requestRejected'),
        cancel: t('friends.requestCancelled'),
        remove: t('friends.friendRemoved')
      }
      toast({
        title: messages[variables.type] || t('common.success'),
        description: variables.type === 'add' ? t('friends.willBeNotified') : ''
      })
      queryClient.invalidateQueries({ queryKey: ['friends'] })
      queryClient.invalidateQueries({ queryKey: ['friend-requests-received'] })
      queryClient.invalidateQueries({ queryKey: ['friend-requests-sent'] })
      setShowRemoveConfirm(null)
      if (variables.type === 'add') {
        setSearchResults([])
        setSearchTerm('')
      }
    },
    onError: (err) => {
      let errorMessage = err.message || t('friends.actionFailed')
      
      // Extract error message from response
      if (err.response?.data) {
        if (err.response.data.message) {
          errorMessage = err.response.data.message
        } else if (err.response.data.errors && Array.isArray(err.response.data.errors)) {
          // Handle validation errors array
          errorMessage = err.response.data.errors.map(e => e.message || e.field).join(', ')
        } else if (err.response.data.error) {
          errorMessage = err.response.data.error
        }
      }
      
      // Handle specific error cases
      if (err.response?.status === 400) {
        if (errorMessage.includes('ObjectId') || errorMessage.includes('pattern')) {
          errorMessage = t('errors.invalidId') || 'Invalid ID format. Please try again.'
        } else if (errorMessage.includes('already')) {
          // Keep the original message for "already" errors
        } else {
          errorMessage = errorMessage || t('errors.validationError') || 'Validation error. Please check your input.'
        }
      }
      
      toast({
        variant: 'destructive',
        title: err.response?.status === 400 
          ? (t('errors.validationError') || 'Validation Error')
          : t('friends.actionFailed'),
        description: errorMessage
      })
      
      // Log error for debugging
      console.error('Friend action error:', {
        status: err.response?.status,
        message: errorMessage,
        data: err.response?.data
      })
      
      // Don't clear remove confirm on error so user can retry
      if (err.response?.status !== 400 && err.response?.status !== 404) {
        setShowRemoveConfirm(null)
      }
    }
  })

  const isLoading = friendsLoading || requestsLoading
  const hasError = friendsError || receivedError || sentError

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Don't block page on error - show banner instead

  // Filter friends based on search
  const filteredFriends = useMemo(() => {
    try {
      if (!searchTerm || activeTab !== 'friends') return Array.isArray(friends) ? friends : []
      const term = searchTerm.toLowerCase()
      const friendsList = Array.isArray(friends) ? friends : []
      return friendsList.filter(f => {
        if (!f) return false
        return (
          f.username?.toLowerCase().includes(term) ||
          f.email?.toLowerCase().includes(term) ||
          f.firstName?.toLowerCase().includes(term) ||
          f.lastName?.toLowerCase().includes(term)
        )
      })
    } catch (error) {
      console.error('Error filtering friends:', error)
      return []
    }
  }, [friends, searchTerm, activeTab])

  // Tab configuration
  const tabs = [
    { 
      id: 'friends', 
      label: t('friends.friends'), 
      count: friends?.length || 0, 
      icon: Users,
      color: 'text-blue-600'
    },
    { 
      id: 'received', 
      label: t('friends.requests'), 
      count: receivedRequests?.length || 0, 
      icon: Clock,
      color: 'text-amber-600'
    },
    { 
      id: 'sent', 
      label: t('friends.sent'), 
      count: sentRequests?.length || 0, 
      icon: User,
      color: 'text-purple-600'
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t('friends.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('friends.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-end">
            <div className="text-2xl font-bold text-primary">
              {friends?.length || 0}
            </div>
            <div className="text-sm text-muted-foreground">
              {t('friends.friendCount', { count: friends?.length || 0 })}
            </div>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {hasError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">
                  {t('errors.serverError')}
                </p>
                <p className="text-xs text-red-600 mt-1">
                  {friendsError?.message || receivedError?.message || sentError?.message || t('errors.unknownError')}
                </p>
              </div>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ['friends'] })
                  queryClient.invalidateQueries({ queryKey: ['friend-requests-received'] })
                  queryClient.invalidateQueries({ queryKey: ['friend-requests-sent'] })
                }}
              >
                {t('common.retry')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            {t('friends.findFriends')}
          </CardTitle>
          <CardDescription>
            {t('friends.searchDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('friends.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ps-10 pe-10"
            />
            {isSearching && (
              <div className="absolute end-3 top-1/2 transform -translate-y-1/2">
                <LoadingSpinner size="sm" />
              </div>
            )}
          </div>
          
          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-3 mt-4 border-t pt-4">
              <p className="text-sm font-medium text-muted-foreground">
                {t('common.search')} Results ({searchResults.length})
              </p>
              <div className="space-y-2">
                {searchResults.map((user, index) => {
                  if (!user) return null
                  const userId = user._id || user.id || `user-${index}`
                  return (
                    <div 
                    key={userId} 
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-semibold text-lg ${getAvatarColor(user.username || user.email)}`}>
                        {getInitials(user.username || user.email)}
                      </div>
                      <div>
                        <p className="font-semibold text-base">{user.username}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                        {(user.firstName || user.lastName) && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {[user.firstName, user.lastName].filter(Boolean).join(' ')}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        console.log('Button clicked, user object:', user)
                        const userId = getValidId(user)
                        console.log('Extracted userId:', userId)
                        if (userId) {
                          console.log('Sending friend request with userId:', userId)
                          friendActionMutation.mutate({ type: 'add', id: userId, item: user })
                        } else {
                          console.error('Invalid user ID:', user)
                          toast({
                            variant: 'destructive',
                            title: t('errors.validationError'),
                            description: 'Invalid user ID. Please try searching again.'
                          })
                        }
                      }}
                      disabled={friendActionMutation.isLoading}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <UserPlus className="me-2 h-4 w-4" />
                      {t('friends.sendRequest')}
                    </Button>
                  </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* No Search Results */}
          {searchTerm.length >= 2 && !isSearching && searchResults.length === 0 && (
            <div className="text-center py-8 border-t pt-4">
              <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium text-muted-foreground mb-1">
                {t('friends.noUsersFound', { term: searchTerm })}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('friends.tryDifferentTerm')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                setSearchTerm('')
                setSearchResults([])
              }}
              className={`flex-1 px-4 py-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                isActive
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? tab.color : ''}`} />
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted-foreground/20 text-muted-foreground'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Content Cards */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {activeTab === 'friends' && <Users className="h-6 w-6 text-blue-600" />}
              {activeTab === 'received' && <Clock className="h-6 w-6 text-amber-600" />}
              {activeTab === 'sent' && <User className="h-6 w-6 text-purple-600" />}
              <div>
                <CardTitle>
                  {activeTab === 'friends' && t('friends.yourFriends')}
                  {activeTab === 'received' && t('friends.friendRequests')}
                  {activeTab === 'sent' && t('friends.sentRequests')}
                </CardTitle>
                <CardDescription>
                  {activeTab === 'friends' && t('friends.peopleYouCanSplit')}
                  {activeTab === 'received' && t('friends.waitingForResponse')}
                  {activeTab === 'sent' && t('friends.requestsYouSent')}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Friends List */}
            {activeTab === 'friends' && (
              <>
                {filteredFriends.length > 0 ? (
                  filteredFriends
                    .map((friend, index) => {
                      const friendId = getValidId(friend)
                      if (!friendId) {
                        console.warn('Invalid friend ID:', friend)
                        return null
                      }
                      return (
                        <div 
                          key={friendId || index} 
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors group"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-semibold text-lg ${getAvatarColor(friend.username || friend.email)}`}>
                              {getInitials(friend.username || friend.email)}
                            </div>
                            <div>
                              <p className="font-semibold text-base">{friend.username}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Mail className="h-3 w-3 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">{friend.email}</p>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              if (friendId) {
                                setShowRemoveConfirm(friendId)
                              } else {
                                toast({
                                  variant: 'destructive',
                                  title: t('errors.validationError'),
                                  description: t('friends.invalidFriendId')
                                })
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 me-2 text-red-600" />
                            {t('friends.remove')}
                          </Button>
                        </div>
                      )
                    })
                    .filter(Boolean)
                ) : (
                  <div className="text-center py-16">
                    <Users className="h-20 w-20 text-muted-foreground mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-semibold mb-2">
                      {searchTerm ? t('friends.noFriendsMatch') : t('friends.noFriends')}
                    </p>
                    <p className="text-sm text-muted-foreground mb-6">
                      {searchTerm ? t('friends.tryDifferentTerm') : t('friends.startSearching')}
                    </p>
                    {!searchTerm && (
                      <Button onClick={() => {
                        const searchInput = document.querySelector('input[placeholder*="Search"]')
                        if (searchInput) searchInput.focus()
                      }}>
                        <UserPlus className="me-2 h-4 w-4" />
                        {t('friends.findFriends')}
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Received Requests */}
            {activeTab === 'received' && (
              <>
                {receivedRequests?.length > 0 ? (
                  receivedRequests.map((request, index) => {
                    const senderUsername = request.username || request.sender?.username || request.userId?.username || 'Unknown'
                    const senderEmail = request.email || request.user_email || request.sender?.email || request.userId?.email || ''
                    const requestId = getValidId(request)
                    
                    if (!requestId) {
                      console.warn('Invalid request ID:', request)
                      return null
                    }
                    
                    return (
                      <div 
                        key={requestId || index} 
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-semibold text-lg ${getAvatarColor(senderUsername || senderEmail)}`}>
                            {getInitials(senderUsername || senderEmail)}
                          </div>
                          <div>
                            <p className="font-semibold text-base">{senderUsername}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">{senderEmail}</p>
                            </div>
                            {request.created_at && (
                              <div className="flex items-center gap-1 mt-2">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(request.created_at)}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => friendActionMutation.mutate({ type: 'accept', id: requestId, item: request })}
                            disabled={friendActionMutation.isLoading}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 me-2" />
                            {t('friends.accept')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => friendActionMutation.mutate({ type: 'reject', id: requestId, item: request })}
                            disabled={friendActionMutation.isLoading}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  }).filter(Boolean)
                ) : (
                  <div className="text-center py-16">
                    <Clock className="h-20 w-20 text-muted-foreground mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-semibold mb-2">{t('friends.noPendingRequests')}</p>
                    <p className="text-sm text-muted-foreground">{t('friends.allCaughtUp')}</p>
                  </div>
                )}
              </>
            )}

            {/* Sent Requests */}
            {activeTab === 'sent' && (
              <>
                {sentRequests?.length > 0 ? (
                  sentRequests.map((request, index) => {
                    const receiverUsername = request.username || request.receiver?.username || request.userId?.username || 'Unknown'
                    const receiverEmail = request.email || request.friend_email || request.receiver?.email || request.userId?.email || ''
                    const requestId = getValidId(request)
                    
                    if (!requestId) {
                      console.warn('Invalid request ID:', request)
                      return null
                    }
                    
                    return (
                      <div 
                        key={requestId || index} 
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-semibold text-lg ${getAvatarColor(receiverUsername || receiverEmail)}`}>
                            {getInitials(receiverUsername || receiverEmail)}
                          </div>
                          <div>
                            <p className="font-semibold text-base">{receiverUsername}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">{receiverEmail}</p>
                            </div>
                            {request.created_at && (
                              <div className="flex items-center gap-1 mt-2">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                <p className="text-xs text-muted-foreground">
                                  {t('friends.sent')} {formatDate(request.created_at)}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => friendActionMutation.mutate({ type: 'cancel', id: requestId, item: request })}
                          disabled={friendActionMutation.isLoading}
                        >
                          <X className="h-4 w-4 me-2" />
                          {t('friends.cancel')}
                        </Button>
                      </div>
                    )
                  }).filter(Boolean)
                ) : (
                  <div className="text-center py-16">
                    <User className="h-20 w-20 text-muted-foreground mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-semibold mb-2">{t('friends.noSentRequests')}</p>
                    <p className="text-sm text-muted-foreground">{t('friends.haventSent')}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Remove Confirmation Modal */}
      {showRemoveConfirm && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" 
          onClick={() => setShowRemoveConfirm(null)}
        >
          <Card 
            className="w-full max-w-md" 
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                {t('friends.removeFriend')}
              </CardTitle>
              <CardDescription>
                {t('friends.removeConfirm')}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3 justify-end pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowRemoveConfirm(null)}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (showRemoveConfirm && getValidId({ _id: showRemoveConfirm })) {
                    friendActionMutation.mutate({ type: 'remove', id: showRemoveConfirm })
                  } else {
                    toast({
                      variant: 'destructive',
                      title: t('errors.validationError'),
                      description: t('friends.invalidFriendId')
                    })
                    setShowRemoveConfirm(null)
                  }
                }}
                disabled={friendActionMutation.isLoading}
              >
                {friendActionMutation.isLoading ? (
                  <>
                    <LoadingSpinner size="sm" className="me-2" />
                    {t('friends.removing')}
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 me-2" />
                    {t('friends.remove')}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default FriendsPage
