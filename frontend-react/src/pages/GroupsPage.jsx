import { useMemo, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import LoadingSpinner from '../components/ui/loading-spinner'
import api from '../lib/api'
import { Plus, Users, DollarSign, Edit, Trash2, X, Check, Search, UserPlus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getInitials, getAvatarColor } from '../lib/utils'
import { useToast } from '../components/ui/use-toast'
import { useAuth } from '../contexts/AuthContext'
import { Dialog, DialogContent } from '../components/ui/dialog'

const GroupsPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingGroup, setEditingGroup] = useState(null)
  const [newGroup, setNewGroup] = useState({
    title: '',
    description: '',
    type: 'Friends',
    currency: 'USD'
  })
  const [showAddMember, setShowAddMember] = useState(null)
  const [memberEmail, setMemberEmail] = useState('')
  const [selectedFriendIds, setSelectedFriendIds] = useState([])
  const [friendSearchTerm, setFriendSearchTerm] = useState('')
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: groupsRes, isLoading, error } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      try {
        const response = await api.get('/groups')
        const data = response.data?.data || response.data
        
        // Ensure groups is always an array and filter out invalid entries
        const groups = Array.isArray(data?.groups) 
          ? data.groups.filter(g => g && g._id && g.title)
          : []
        
        return {
          groups,
          pagination: data?.pagination || {}
        }
      } catch (err) {
        console.error('Error fetching groups:', err)
        return {
          groups: [],
          pagination: {}
        }
      }
    },
    refetchOnWindowFocus: true,
    refetchOnMount: true
  })

  const { data: friendsList } = useQuery({
    queryKey: ['friends'],
    queryFn: async () => {
      const response = await api.get('/friends/my')
      const raw = response.data?.data ?? response.data
      if (Array.isArray(raw)) return raw
      if (raw && Array.isArray(raw.friends)) return raw.friends
      if (raw && Array.isArray(raw.data)) return raw.data
      return []
    }
  })
  const friends = friendsList ?? []

  const createGroupMutation = useMutation({
    mutationFn: async () => {
      const currency = newGroup.currency.toUpperCase().slice(0, 3).padEnd(3, 'USD'[0])
      if (currency.length !== 3) {
        throw new Error('Currency must be exactly 3 characters (e.g., USD, EUR, MAD)')
      }
      const payload = {
        title: newGroup.title.trim(),
        description: newGroup.description?.trim() || '',
        type: newGroup.type || 'Other',
        currency: currency
      }
      if (selectedFriendIds.length > 0) {
        payload.member_ids = selectedFriendIds.map(id => (typeof id === 'string' ? id : id?.toString?.() || id))
      }
      const response = await api.post('/groups', payload)
      return response.data
    },
    onSuccess: async (data) => {
      toast({
        title: t('notifications.success'),
        description: t('groups.groupCreated')
      })
      
      // Reset form first
      resetForm()
      
      // Invalidate and refetch groups
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      
      // Wait a moment for database to save, then refetch
      setTimeout(() => {
        queryClient.refetchQueries({ 
          queryKey: ['groups'],
          exact: false
        })
      }, 300)
    },
    onError: (err) => {
      toast({
        variant: 'destructive',
        title: t('errors.serverError'),
        description: err.response?.data?.message || err.message
      })
    }
  })

  const updateGroupMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/groups/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      toast({ title: t('notifications.success') })
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      resetForm()
    },
    onError: (err) => {
      toast({
        variant: 'destructive',
        title: t('errors.serverError'),
        description: err.response?.data?.message || err.message
      })
    }
  })

  const deleteGroupMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/groups/${id}`)
      return response.data
    },
    onSuccess: () => {
      toast({ title: t('groups.groupDeleted') })
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
    onError: (err) => {
      toast({
        variant: 'destructive',
        title: t('groups.failedToDeleteGroup'),
        description: err.response?.data?.message || err.message
      })
    }
  })

  const addMemberMutation = useMutation({
    mutationFn: async ({ groupId, userId }) => {
      const response = await api.post(`/groups/${groupId}/members`, { userId })
      return response.data
    },
    onSuccess: () => {
      toast({ 
        title: t('groups.memberAdded'),
        description: t('groups.memberAddedDesc')
      })
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      queryClient.refetchQueries({ queryKey: ['groups'], exact: false })
      setShowAddMember(null)
      setMemberEmail('')
    },
    onError: (err) => {
      toast({
        variant: 'destructive',
        title: t('groups.failedToAddMember'),
        description: err.response?.data?.message || err.message
      })
    }
  })

  const removeMemberMutation = useMutation({
    mutationFn: async ({ groupId, userId }) => {
      const response = await api.delete(`/groups/${groupId}/members/${userId}`)
      return response.data
    },
    onSuccess: () => {
      toast({ title: t('groups.memberRemoved') })
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      queryClient.invalidateQueries({ queryKey: ['group'] })
    },
    onError: (err) => {
      toast({
        variant: 'destructive',
        title: t('groups.failedToRemoveMember'),
        description: err.response?.data?.message || err.message
      })
    }
  })

  const resetForm = useCallback(() => {
    setNewGroup({
      title: '',
      description: '',
      type: 'Friends',
      currency: 'USD'
    })
    setSelectedFriendIds([])
    setFriendSearchTerm('')
    setShowAddForm(false)
    setEditingGroup(null)
  }, [])

  const handleEdit = (group) => {
    navigate(`/groups/${group._id}/edit`)
  }

  const handleSave = () => {
    // Validate title
    if (!newGroup.title || !newGroup.title.trim()) {
      toast({
        variant: 'destructive',
        title: t('errors.validationError'),
        description: t('groups.groupTitleRequired')
      })
      return
    }
    
    // Validate currency
    const currency = newGroup.currency.toUpperCase().trim()
    if (currency.length !== 3) {
      toast({
        variant: 'destructive',
        title: t('errors.validationError'),
        description: t('groups.currencyMustBe3Chars')
      })
      return
    }
    
    if (editingGroup) {
      updateGroupMutation.mutate({
        id: editingGroup._id,
        data: {
          ...newGroup,
          currency: currency
        }
      })
    } else {
      createGroupMutation.mutate()
    }
  }

  const handleAddMember = async (groupId) => {
    if (!memberEmail || !memberEmail.trim()) {
      toast({
        variant: 'destructive',
        title: t('errors.validationError'),
        description: t('groups.enterFriendEmailOrUsername')
      })
      return
    }

    // Find friend by email or username
    const friend = Array.isArray(friends) ? friends.find(f => {
      const email = f.email?.toLowerCase() || ''
      const username = f.username?.toLowerCase() || ''
      const searchTerm = memberEmail.toLowerCase().trim()
      return email === searchTerm || username === searchTerm
    }) : null
    
    if (!friend) {
      toast({
        variant: 'destructive',
        title: t('groups.friendNotFound'),
        description: t('groups.makeSureFriendFirstOnlyFriends')
      })
      return
    }

    // Get the friend's user ID
    const userId = friend._id || friend.id || friend.userId?._id || friend.userId?.id
    
    if (!userId) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('groups.couldNotFindFriendId')
      })
      return
    }

    addMemberMutation.mutate({ groupId, userId })
  }

  const filteredFriends = useMemo(() => {
    if (!friendSearchTerm || !friendSearchTerm.trim()) return friends
    const term = friendSearchTerm.toLowerCase().trim()
    return friends.filter(f => {
      const username = (f.username || '').toLowerCase()
      const email = (f.email || '').toLowerCase()
      const firstName = (f.firstName || '').toLowerCase()
      const lastName = (f.lastName || '').toLowerCase()
      return username.includes(term) || email.includes(term) || firstName.includes(term) || lastName.includes(term)
    })
  }, [friends, friendSearchTerm])

  const toggleFriendSelection = useCallback((friendId) => {
    setSelectedFriendIds(prev => 
      prev.includes(friendId) ? prev.filter(id => id !== friendId) : [...prev, friendId]
    )
  }, [])

  const filteredGroups = useMemo(() => {
    // Ensure we have a valid groups array
    const groups = Array.isArray(groupsRes?.groups) ? groupsRes.groups : []
    
    // Filter out any null or invalid groups
    const validGroups = groups.filter(group => 
      group && group._id && group.title
    )
    
    // Apply search filter if search term exists
    if (!searchTerm || searchTerm.trim() === '') {
      return validGroups
    }
    
    const searchLower = searchTerm.toLowerCase().trim()
    return validGroups.filter((group) =>
      group.title?.toLowerCase().includes(searchLower) ||
      group.description?.toLowerCase().includes(searchLower) ||
      group.type?.toLowerCase().includes(searchLower)
    )
  }, [groupsRes, searchTerm])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-red-500">
        Error loading groups: {error.message}
      </div>
    )
  }

  const groups = filteredGroups || []

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t('groups.title')}</h1>
          <p className="text-muted-foreground">
            {t('groups.subtitle')}
          </p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="me-2 h-4 w-4" />
          {showAddForm ? t('common.cancel') : t('groups.createGroup')}
        </Button>
      </div>

      <Dialog open={showAddForm} onOpenChange={(open) => { setShowAddForm(open); if (!open) { setEditingGroup(null); resetForm(); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
          <Card className="border-0 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>{editingGroup ? t('groups.editGroup') : t('groups.createGroup')}</CardTitle>
                <CardDescription>{t('groups.subtitle')}</CardDescription>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-full" onClick={resetForm} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('groups.groupTitle')} *</label>
                <Input
                  value={newGroup.title}
                  onChange={(e) => setNewGroup({ ...newGroup, title: e.target.value })}
                  placeholder={t('groups.groupTitle')}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('groups.currency')}</label>
                <select
                  value={newGroup.currency}
                  onChange={(e) => setNewGroup({ ...newGroup, currency: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="MAD">MAD - Moroccan Dirham</option>
                  <option value="CAD">CAD - Canadian Dollar</option>
                  <option value="AUD">AUD - Australian Dollar</option>
                  <option value="JPY">JPY - Japanese Yen</option>
                  <option value="CNY">CNY - Chinese Yuan</option>
                  <option value="INR">INR - Indian Rupee</option>
                  <option value="BRL">BRL - Brazilian Real</option>
                </select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">{t('groups.description')}</label>
                <Input
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                  placeholder={t('groups.description')}
                />
              </div>
            </div>

            {/* Add friends to this group (only when creating, not editing) */}
            {!editingGroup && (
              <div className="space-y-3 pt-4 border-t">
                <label className="text-sm font-medium flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  {t('groups.addFriendsToGroup') || 'Add friends to this group'}
                </label>
                <p className="text-xs text-muted-foreground">
                  {t('groups.selectFriendsToAdd') || 'Search and select friends to add as members.'}
                </p>
                <div className="relative">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('common.search') + ' ' + (t('groups.friends') || 'friends') + '...'}
                    value={friendSearchTerm}
                    onChange={(e) => setFriendSearchTerm(e.target.value)}
                    className="ps-10"
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-64 overflow-y-auto p-1">
                  {filteredFriends.length > 0 ? (
                    filteredFriends.map((friend) => {
                      const fid = friend._id || friend.id || friend.userId?._id
                      if (!fid) return null
                      const isSelected = selectedFriendIds.includes(fid)
                      const name = friend.username || friend.firstName || friend.email || 'Friend'
                      return (
                        <button
                          key={fid}
                          type="button"
                          onClick={() => toggleFriendSelection(fid)}
                          className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 text-left transition-all hover:shadow-md ${
                            isSelected
                              ? 'border-primary bg-primary/10 shadow-sm'
                              : 'border-border hover:border-primary/50 bg-card'
                          }`}
                        >
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 ${getAvatarColor(name)}`}>
                            {getInitials(name)}
                          </div>
                          <span className="text-sm font-medium truncate w-full text-center" title={name}>
                            {name}
                          </span>
                          <span className={`flex items-center justify-center w-6 h-6 rounded-full border-2 text-xs ${isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'}`}>
                            {isSelected ? <Check className="h-3 w-3" /> : null}
                          </span>
                        </button>
                      )
                    })
                  ) : (
                    <div className="col-span-full text-center py-6 text-muted-foreground text-sm">
                      {friendSearchTerm
                        ? (t('groups.noFriendsMatch') || 'No friends match your search.')
                        : (t('groups.addFriendsFirst') || 'Add friends first from the Friends page to invite them here.')}
                    </div>
                  )}
                </div>
                {selectedFriendIds.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {selectedFriendIds.length} {t('groups.selected') || 'selected'}
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={!newGroup.title || createGroupMutation.isLoading || updateGroupMutation.isLoading}
              >
                {createGroupMutation.isLoading || updateGroupMutation.isLoading ? (
                  <>
                    <LoadingSpinner size="sm" className="me-2" />
                    {t('common.loading')}
                  </>
                ) : (
                  <>
                    <Check className="me-2 h-4 w-4" />
                    {editingGroup ? t('common.save') : t('groups.createGroup')}
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                <X className="me-2 h-4 w-4" />
                {t('common.cancel')}
              </Button>
            </div>
          </CardContent>
        </Card>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>{t('groups.title')}</CardTitle>
          <CardDescription>
            {t('groups.groupsFound', { count: groups.length })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('common.search') + ' ' + t('groups.title').toLowerCase() + '...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ps-10"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {groups.length > 0 ? (
              groups.map((group) => (
                <Card key={group._id} className="hover:shadow-lg transition-all duration-200 group border-2 hover:border-primary/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 ${getAvatarColor(group.title)}`}>
                          {getInitials(group.title)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg font-semibold truncate">{group.title}</CardTitle>
                          <CardDescription className="text-xs line-clamp-2 mt-1">
                            {group.description || t('groups.noDescription')}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        {group.isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleEdit(group)}
                            title={t('groups.editGroup')}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {(group.ownerId?._id?.toString() === user?._id?.toString() || group.ownerId?.toString() === user?._id?.toString()) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              if (confirm(t('groups.deleteGroupConfirm'))) {
                                deleteGroupMutation.mutate(group._id)
                              }
                            }}
                            title={t('groups.deleteGroup')}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{group.memberCount || 0}</span>
                        <span className="text-muted-foreground text-xs">{t('groups.members')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{group.currency || 'USD'}</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground mb-2">
                        <span className="font-medium">Type:</span> {group.type || 'Other'}
                      </p>
                      {showAddMember === group._id ? (
                        <div className="space-y-2">
                          <Input
                            placeholder={t('groups.friendEmailOrUsername')}
                            value={memberEmail}
                            onChange={(e) => setMemberEmail(e.target.value)}
                            size="sm"
                            className="h-8 text-xs"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => handleAddMember(group._id)}
                              disabled={!memberEmail || addMemberMutation.isLoading}
                            >
                              <UserPlus className="me-1 h-3 w-3" />
                              {t('common.add')}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs"
                              onClick={() => {
                                setShowAddMember(null)
                                setMemberEmail('')
                              }}
                            >
                              {t('common.cancel')}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full h-8 text-xs"
                          onClick={() => setShowAddMember(group._id)}
                        >
                          <UserPlus className="me-2 h-3 w-3" />
                          {t('groups.addMember')}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full">
                <Card className="border-dashed">
                  <CardContent className="text-center py-12">
                    <div className="flex flex-col items-center justify-center">
                      <Users className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                      <h3 className="text-lg font-semibold mb-2">
                        {searchTerm ? t('groups.noGroupsMatch') : t('groups.noGroupsFound')}
                      </h3>
                      <p className="text-muted-foreground mb-6 text-sm">
                        {searchTerm 
                          ? t('groups.tryAdjustingSearch') 
                          : t('groups.createFirstGroupToStart')}
                      </p>
                      {!searchTerm && (
                        <Button onClick={() => setShowAddForm(true)} size="lg">
                          <Plus className="me-2 h-4 w-4" />
                          {t('groups.createYourFirstGroup')}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default GroupsPage
