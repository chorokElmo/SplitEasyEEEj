import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import LoadingSpinner from '../components/ui/loading-spinner'
import api from '../lib/api'
import { MessageSquare, Search, Users, ArrowLeft } from 'lucide-react'
import { getInitials, getAvatarColor } from '../lib/utils'
import GroupChat from '../components/GroupChat'
import { useNavigate } from 'react-router-dom'

const ChatPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedGroupId, setSelectedGroupId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Fetch unread counts
  const { data: unreadData } = useQuery({
    queryKey: ['chat', 'unread-counts'],
    queryFn: async () => {
      const response = await api.get('/chat/unread-counts')
      return response.data.data.unreadCounts || {}
    },
    refetchInterval: 15000 // Check every 15 seconds
  })

  // Fetch user's groups
  const { data: groupsData, isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const response = await api.get('/groups')
      const data = response.data?.data || response.data
      return {
        groups: Array.isArray(data?.groups) ? data.groups : [],
        pagination: data?.pagination || {}
      }
    }
  })

  // Filter groups by search term
  const filteredGroups = groupsData?.groups?.filter(group =>
    group.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  const selectedGroup = groupsData?.groups?.find(g => g._id === selectedGroupId)

  // Auto-select first group when there is exactly one (or first when none selected and list loads)
  useEffect(() => {
    const groups = groupsData?.groups || []
    if (groups.length === 0) return
    if (selectedGroupId) return
    const firstId = groups[0]._id?.toString() || groups[0]._id
    setSelectedGroupId(firstId)
  }, [groupsData?.groups, selectedGroupId])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="rounded-full"
        >
          <ArrowLeft className="h-4 w-4 me-2" />
          {t('chat.back')}
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{t('chat.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('chat.subtitle')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Groups List - choose group to start chat */}
        <div className="lg:col-span-1">
          <Card className="border-2 border-border/50 shadow-sm h-[600px] flex flex-col">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                {t('chat.yourGroups')}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {t('chat.chooseGroupToStart')}
              </p>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
              {/* Search */}
              <div className="p-4 border-b border-border/50">
                <div className="relative">
                  <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('chat.searchGroups')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="ps-10 rounded-lg"
                  />
                </div>
              </div>

              {/* Groups List */}
              <div className="flex-1 overflow-y-auto p-2">
                {filteredGroups.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">{t('groups.noGroupsFound')}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredGroups.map((group) => {
                      const groupId = group._id?.toString() || group._id
                      const unreadCount = unreadData?.[groupId] || 0
                      
                      return (
                        <button
                          key={group._id}
                          onClick={() => {
                            setSelectedGroupId(group._id)
                            // Mark as read when selected
                            if (unreadCount > 0) {
                              queryClient.invalidateQueries({ queryKey: ['chat', 'unread-counts'] })
                            }
                          }}
                          className={`w-full text-left p-3 rounded-lg transition-all duration-200 relative ${
                            selectedGroupId === group._id
                              ? 'bg-primary text-primary-foreground shadow-md'
                              : 'bg-card border border-border/50 hover:border-primary/50 hover:bg-primary/5'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 ${
                              selectedGroupId === group._id
                                ? 'bg-primary-foreground/20'
                                : getAvatarColor(group.title)
                            }`}>
                              {getInitials(group.title)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className={`font-semibold text-sm truncate ${
                                  selectedGroupId === group._id ? 'text-primary-foreground' : 'text-foreground'
                                }`}>
                                  {group.title}
                                </p>
                                {unreadCount > 0 && (
                                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                  </span>
                                )}
                              </div>
                              <p className={`text-xs truncate ${
                                selectedGroupId === group._id ? 'text-primary-foreground/80' : 'text-muted-foreground'
                              }`}>
                                {t('chat.memberCount', { count: group.memberCount || 0 })}
                              </p>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-3">
          <GroupChat 
            groupId={selectedGroupId || null} 
            groupTitle={selectedGroup?.title || ''}
            showEditToggle={true}
          />
        </div>
      </div>
    </div>
  )
}

export default ChatPage
