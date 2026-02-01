import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import LoadingSpinner from '../components/ui/loading-spinner'
import api from '../lib/api'
import { 
  ArrowLeft, 
  UserPlus, 
  X, 
  Search, 
  Users, 
  Crown,
  Trash2,
  Check,
  User
} from 'lucide-react'
import { getInitials, getAvatarColor } from '../lib/utils'
import { useToast } from '../components/ui/use-toast'
import { useAuth } from '../contexts/AuthContext'
import GroupChatBubble from '../components/GroupChatBubble'

const EditGroupPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])

  // Fetch group details with members
  const { data: groupData, isLoading: groupLoading, error: groupError } = useQuery({
    queryKey: ['group', id],
    queryFn: async () => {
      const response = await api.get(`/groups/${id}`)
      return response.data.data.group
    },
    enabled: !!id
  })

  // Fetch user's friends for filtering
  const { data: friendsData } = useQuery({
    queryKey: ['friends'],
    queryFn: async () => {
      const response = await api.get('/friends/my')
      return Array.isArray(response.data) ? response.data : []
    }
  })

  // Real-time friend search - filters friends list locally
  useEffect(() => {
    if (!friendsData || !Array.isArray(friendsData)) {
      setSearchResults([])
      return
    }

    if (searchQuery.trim().length === 0) {
      setSearchResults([])
      return
    }

    const searchLower = searchQuery.toLowerCase().trim()
    
    // Filter friends based on search query
    const filtered = friendsData.filter(friend => {
      const email = friend.email?.toLowerCase() || ''
      const username = friend.username?.toLowerCase() || ''
      const firstName = friend.firstName?.toLowerCase() || ''
      const lastName = friend.lastName?.toLowerCase() || ''
      const fullName = `${firstName} ${lastName}`.trim().toLowerCase()
      
      return email.includes(searchLower) || 
             username.includes(searchLower) || 
             firstName.includes(searchLower) || 
             lastName.includes(searchLower) ||
             fullName.includes(searchLower)
    })

    // Filter out users who are already members
    const memberIds = groupData?.members?.map(m => {
      const memberUser = m.userId || m
      return memberUser._id?.toString() || memberUser.toString()
    }) || []
    
    const availableFriends = filtered.filter(friend => {
      const friendId = friend._id?.toString() || friend.id?.toString()
      return !memberIds.includes(friendId)
    })
    
    setSearchResults(availableFriends)
  }, [searchQuery, friendsData, groupData])

  // Add member mutation
  const addMemberMutation = useMutation({
    mutationFn: async (userId) => {
      const response = await api.post(`/groups/${id}/members`, { userId })
      return response.data
    },
    onSuccess: () => {
      toast({
        title: t('notifications.success'),
        description: t('groups.memberAddedToGroup')
      })
      queryClient.invalidateQueries({ queryKey: ['group', id] })
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      setSearchQuery('')
      setSearchResults([])
    },
    onError: (err) => {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: err.response?.data?.message || t('groups.failedToAddMember')
      })
    }
  })

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (userId) => {
      const response = await api.delete(`/groups/${id}/members/${userId}`)
      return response.data
    },
    onSuccess: () => {
      toast({
        title: t('notifications.success'),
        description: t('groups.memberRemovedFromGroup')
      })
      queryClient.invalidateQueries({ queryKey: ['group', id] })
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
    onError: (err) => {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: err.response?.data?.message || t('groups.failedToRemoveMember')
      })
    }
  })

  // Set member admin status
  const setMemberAdminMutation = useMutation({
    mutationFn: async ({ userId, isAdmin }) => {
      const response = await api.put(`/groups/${id}/members/${userId}`, { isAdmin })
      return response.data
    },
    onSuccess: (_, { isAdmin }) => {
      toast({
        title: t('notifications.success'),
        description: isAdmin ? t('groups.memberNowAdmin', 'Member is now admin') : t('groups.adminRoleRemoved', 'Admin role removed')
      })
      queryClient.invalidateQueries({ queryKey: ['group', id] })
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
    onError: (err) => {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: err.response?.data?.message || t('groups.failedToUpdateMember')
      })
    }
  })

  const handleAddMember = (userId) => {
    addMemberMutation.mutate(userId)
  }

  const handleRemoveMember = (userId, memberName) => {
    if (window.confirm(t('groups.removeMemberConfirm', { name: memberName }))) {
      removeMemberMutation.mutate(userId)
    }
  }

  const isOwner = groupData?.ownerId?._id?.toString() === user?._id?.toString() || 
                  groupData?.ownerId?.toString() === user?._id?.toString()
  const isAdmin = groupData?.isAdmin || isOwner

  if (groupLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (groupError || !groupData) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">{t('errors.loadingGroup')}</p>
        <Button onClick={() => navigate('/groups')} variant="outline">
          <ArrowLeft className="me-2 h-4 w-4" />
          {t('groups.backToGroups')}
        </Button>
      </div>
    )
  }

  const members = groupData.members || []

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {!isAdmin && (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-900/20">
          <CardContent className="py-3 flex items-center gap-2 text-amber-800 dark:text-amber-200 text-sm">
            <Crown className="h-4 w-4 shrink-0" />
            {t('groups.onlyAdminsCanEdit', 'Only group admins can add/remove members and change roles.')}
          </CardContent>
        </Card>
      )}
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/groups')}
          className="rounded-full"
        >
          <ArrowLeft className="h-4 w-4 me-2" />
          {t('common.back')}
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">{groupData.title}</h1>
          <p className="text-muted-foreground mt-1">
            {groupData.description || t('groups.noDescription')}
          </p>
        </div>
        {isOwner && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-full">
            <Crown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-medium text-amber-700 dark:text-amber-300">{t('groups.owner')}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Members Section */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-2 border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    {t('groups.groupMembers')}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {t('groups.memberCount', { count: members.length })}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{t('groups.noMembersYet')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {members.map((member) => {
                    const memberUser = member.userId || member
                    const memberId = memberUser._id?.toString() || memberUser.toString()
                    const isMemberOwner = groupData.ownerId?._id?.toString() === memberId ||
                                         groupData.ownerId?.toString() === memberId
                    const isCurrentUser = user?._id?.toString() === memberId
                    const canRemove = isAdmin && !isMemberOwner && !isCurrentUser
                    const canSetAdmin = isAdmin && !isMemberOwner

                    return (
                      <div
                        key={memberId}
                        className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-background to-muted/20 border border-border/50 hover:border-primary/30 transition-all duration-200 hover:shadow-md"
                      >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg flex-shrink-0 ${getAvatarColor(memberUser.username || memberUser.email || 'User')}`}>
                          {getInitials(
                            memberUser.firstName && memberUser.lastName
                              ? `${memberUser.firstName} ${memberUser.lastName}`
                              : memberUser.username || memberUser.email || 'U'
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-foreground truncate">
                              {memberUser.firstName && memberUser.lastName
                                ? `${memberUser.firstName} ${memberUser.lastName}`
                                : memberUser.username || memberUser.email}
                            </p>
                            {isMemberOwner && (
                              <Crown className="h-4 w-4 text-amber-500 flex-shrink-0" />
                            )}
                            {member.isAdmin && !isMemberOwner && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                                {t('common.admin')}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {memberUser.email || memberUser.username}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {canSetAdmin && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setMemberAdminMutation.mutate({
                                userId: memberId,
                                isAdmin: !member.isAdmin
                              })}
                              disabled={setMemberAdminMutation.isLoading}
                              className="text-xs"
                            >
                              {member.isAdmin ? t('groups.removeAdmin', 'Remove admin') : t('groups.makeAdmin', 'Make admin')}
                            </Button>
                          )}
                          {canRemove && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveMember(
                                memberId,
                                memberUser.firstName && memberUser.lastName
                                  ? `${memberUser.firstName} ${memberUser.lastName}`
                                  : memberUser.username || memberUser.email
                              )}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                              disabled={removeMemberMutation.isLoading}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Add Member Section */}
        <div className="space-y-6">
          {isAdmin && (
            <Card className="border-2 border-primary/20 shadow-lg bg-gradient-to-br from-primary/5 to-background sticky top-6">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-primary" />
                  {t('groups.addMember')}
                </CardTitle>
                <CardDescription>
                  {t('groups.searchFriendsToAdd')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('groups.searchByNameOrEmail')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="ps-10 rounded-lg border-2 focus:border-primary transition-colors"
                  />
                </div>

                {/* Search Results */}
                {searchQuery.trim().length > 0 && (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {searchResults.length > 0 ? (
                      searchResults.map((friend) => {
                        const friendId = friend._id?.toString() || friend.id?.toString()
                        const isAdding = addMemberMutation.isLoading
                        
                        return (
                          <div
                            key={friendId}
                            className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200"
                          >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0 ${getAvatarColor(friend.username || friend.email || 'User')}`}>
                              {getInitials(
                                friend.firstName && friend.lastName
                                  ? `${friend.firstName} ${friend.lastName}`
                                  : friend.username || friend.email || 'U'
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-foreground truncate">
                                {friend.firstName && friend.lastName
                                  ? `${friend.firstName} ${friend.lastName}`
                                  : friend.username || friend.email}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {friend.email || friend.username}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleAddMember(friendId)}
                              disabled={isAdding}
                              className="rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground"
                            >
                              {isAdding ? (
                                <LoadingSpinner size="sm" />
                              ) : (
                                <>
                                  <Check className="h-3 w-3 me-1" />
                                  {t('common.add')}
                                </>
                              )}
                            </Button>
                          </div>
                        )
                      })
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">{t('groups.noFriendsFound')}</p>
                        <p className="text-xs mt-1">{t('groups.makeSureFriendFirst')}</p>
                      </div>
                    )}
                  </div>
                )}

                {searchQuery.trim().length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">{t('groups.startTypingToSearch')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Group Info Card */}
          <Card className="border border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">{t('groups.groupInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Type</p>
                <p className="text-foreground">{groupData.type || 'Other'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Currency</p>
                <p className="text-foreground">{groupData.currency || 'USD'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Created</p>
                <p className="text-foreground text-sm">
                  {new Date(groupData.createdAt).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Floating chat bubble - opens chat in a popover */}
      <GroupChatBubble groupId={id} groupTitle={groupData.title} />
    </div>
  )
}

export default EditGroupPage
