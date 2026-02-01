import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import LoadingSpinner from './ui/loading-spinner'
import api, { getChatWebSocketUrl } from '../lib/api'
import { Send, MessageSquare, Trash2, User, Edit2, X } from 'lucide-react'
import { getInitials, getAvatarColor } from '../lib/utils'
import { playNotificationSound } from '../lib/sound'
import { useToast } from './ui/use-toast'
import { useAuth } from '../contexts/AuthContext'

const GroupChat = ({ groupId, groupTitle, showEditToggle = false, compact = false }) => {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [message, setMessage] = useState('')
  const [ws, setWs] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isEditMode, setIsEditMode] = useState(true) // Always allow editing by default
  const messagesEndRef = useRef(null)
  const chatContainerRef = useRef(null)

  const groupIdKey = groupId ? String(groupId) : ''

  // Fetch messages – poll every 3s when WebSocket disconnected so new messages appear without reload
  const { data: messagesData, isLoading } = useQuery({
    queryKey: ['chat', groupIdKey, 'messages'],
    queryFn: async () => {
      const response = await api.get(`/chat/${groupId}/messages`)
      return response.data.data.messages || []
    },
    enabled: !!groupId,
    refetchOnWindowFocus: false,
    refetchInterval: isConnected ? false : 3000,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'unread-counts'] })
    }
  })

  // Send message mutation – optimistic update so message appears instantly
  const sendMessageMutation = useMutation({
    mutationFn: async (content) => {
      if (!groupId) throw new Error('Group ID is required')
      const response = await api.post(`/chat/${groupId}/messages`, { content })
      return response.data
    },
    onMutate: async (content) => {
      const tempId = `temp-${Date.now()}`
      const optimisticMessage = {
        _id: tempId,
        content,
        createdAt: new Date().toISOString(),
        senderId: user,
        sender: user
      }
      queryClient.setQueryData(['chat', groupIdKey, 'messages'], (old) => [...(old || []), optimisticMessage])
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      return { tempId }
    },
    onSuccess: (data, _content, context) => {
      const realMessage = data?.data?.message || data?.message
      if (realMessage && context?.tempId && groupIdKey) {
        queryClient.setQueryData(['chat', groupIdKey, 'messages'], (old) => {
          if (!old) return [realMessage]
          const next = old.map((m) => (m._id === context.tempId ? realMessage : m))
          return next.filter((m, i, arr) => arr.findIndex((x) => x._id === m._id) === i)
        })
      } else if (groupIdKey) {
        queryClient.invalidateQueries({ queryKey: ['chat', groupIdKey, 'messages'] })
      }
    },
    onError: (err, _content, context) => {
      if (context?.tempId && groupIdKey) {
        queryClient.setQueryData(['chat', groupIdKey, 'messages'], (old) =>
          old ? old.filter((m) => m._id !== context.tempId) : []
        )
      }
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: err.response?.data?.message || t('chat.sendFailed')
      })
    }
  })

  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId) => {
      const response = await api.delete(`/chat/messages/${messageId}`)
      return response.data
    },
    onSuccess: () => {
      if (groupIdKey) {
        queryClient.invalidateQueries({ queryKey: ['chat', groupIdKey, 'messages'] })
      }
    },
    onError: (err) => {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: err.response?.data?.message || t('chat.deleteFailed')
      })
    }
  })

  // WebSocket connection
  useEffect(() => {
    if (!groupId || !user?._id) {
      setIsConnected(false)
      return
    }

    let websocket = null
    let reconnectTimeout = null
    let reconnectAttempts = 0
    const maxReconnectAttempts = 5

    const connectWebSocket = () => {
      try {
        const token = localStorage.getItem('token')
        const wsBase = getChatWebSocketUrl()
        const path = wsBase.endsWith('/api/chat/ws') ? wsBase : `${wsBase.replace(/\/+$/, '')}/api/chat/ws`
        const wsUrl = `${path}?groupId=${groupId}&userId=${encodeURIComponent(user._id)}${token ? `&token=${encodeURIComponent(token)}` : ''}`
        if (import.meta.env.DEV) console.log('WebSocket:', wsUrl)
        websocket = new WebSocket(wsUrl)

        websocket.onopen = () => {
          console.log('Chat WebSocket connected successfully')
          setIsConnected(true)
          reconnectAttempts = 0 // Reset on successful connection
        }

        websocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            
            if (data.type === 'new_message') {
              const msg = data.data
              const senderId = msg.senderId?._id?.toString() || msg.senderId?.toString() || msg.sender?.toString()
              const isFromMe = senderId === user?._id?.toString()
              if (!isFromMe) {
                playNotificationSound()
              }
              const key = ['chat', String(groupId), 'messages']
              queryClient.setQueryData(key, (old) => {
                if (!old) return [msg]
                const exists = old.some(m => m._id === msg._id)
                if (exists) return old
                return [...old, msg]
              })
              scrollToBottom()
            } else if (data.type === 'message_deleted') {
              const key = ['chat', String(groupId), 'messages']
              queryClient.setQueryData(key, (old) => {
                if (!old) return []
                return old.filter(m => m._id !== data.data.messageId)
              })
            } else if (data.type === 'connected') {
              console.log('Chat connected:', data.message)
              setIsConnected(true)
            } else if (data.type === 'pong') {
              // Keep-alive response
              console.log('WebSocket pong received')
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error)
          }
        }

        websocket.onerror = (error) => {
          console.error('WebSocket error:', error)
          setIsConnected(false)
          // Don't show toast on every error, only on initial connection failure
          if (reconnectAttempts === 0) {
            console.warn('WebSocket connection failed, will retry silently')
          }
        }

        websocket.onclose = (event) => {
          console.log('Chat WebSocket disconnected', event.code, event.reason)
          setIsConnected(false)
          
          // Attempt to reconnect if not a normal closure and haven't exceeded max attempts
          if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts && groupId && user?._id) {
            reconnectAttempts++
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000) // Exponential backoff, max 10s
            console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})...`)
            
            reconnectTimeout = setTimeout(() => {
              connectWebSocket()
            }, delay)
          } else if (reconnectAttempts >= maxReconnectAttempts) {
            console.warn('WebSocket reconnection limit reached; chat still works via HTTP.')
            toast({
              title: t('chat.connectionError'),
              description: t('chat.connectionErrorDesc')
            })
          }
        }

        setWs(websocket)
      } catch (error) {
        console.error('Error creating WebSocket:', error)
        setIsConnected(false)
      }
    }

    connectWebSocket()

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
      }
      if (websocket) {
        websocket.close()
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- t is stable; omit to avoid effect churn
  }, [groupId, user?._id, queryClient, toast])

  // Keep-alive ping
  useEffect(() => {
    if (!ws || !isConnected) return

    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000) // Ping every 30 seconds

    return () => clearInterval(pingInterval)
  }, [ws, isConnected])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom()
  }, [messagesData])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (!message.trim() || sendMessageMutation.isLoading) return
    const content = message.trim()
    setMessage('')
    sendMessageMutation.mutate(content)
  }

  const handleDeleteMessage = (messageId) => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      deleteMessageMutation.mutate(messageId)
    }
  }

  const formatTime = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const messages = messagesData || []

  // Show empty state if no group selected
  if (!groupId) {
    return (
      <Card className="border-2 border-border/50 shadow-lg h-[600px] flex items-center justify-center">
        <CardContent className="text-center">
          <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-xl font-semibold mb-2">Select a Group</h3>
          <p className="text-muted-foreground">
            Choose a group from the list to start chatting
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`border-2 border-border/50 shadow-lg flex flex-col ${compact ? 'min-h-0 flex-1 border-0 shadow-none' : 'h-[600px]'}`}>
      {!compact && (
      <CardHeader className="pb-3 border-b border-border/50 bg-gradient-to-r from-primary/5 to-background">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{groupTitle} Chat</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-xs text-muted-foreground">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
          </div>
          {/* Edit toggle removed - chat is always enabled */}
        </div>
      </CardHeader>
      )}

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden min-h-0">
        {/* Messages Area */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-background to-muted/20 min-h-0"
        >
          {isLoading && messages.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="md" />
              <span className="ml-2 text-sm text-muted-foreground">{t('common.loading')}</span>
            </div>
          ) : null}
          {!isLoading && messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <MessageSquare className="h-16 w-16 mb-4 opacity-30" />
              <p className="text-lg font-medium">No messages yet</p>
              <p className="text-sm mt-1">Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const sender = msg.senderId || msg.sender
              const isOwnMessage = sender?._id?.toString() === user?._id?.toString() ||
                                   sender?.toString() === user?._id?.toString()
              
              return (
                <div
                  key={msg._id}
                  className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 ${getAvatarColor(sender?.username || sender?.email || 'User')}`}>
                    {getInitials(
                      sender?.firstName && sender?.lastName
                        ? `${sender.firstName} ${sender.lastName}`
                        : sender?.username || sender?.email || 'U'
                    )}
                  </div>

                  {/* Message Content */}
                  <div className={`flex flex-col gap-1 max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                    <div className={`flex items-center gap-2 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                      <span className="text-xs font-medium text-foreground">
                        {isOwnMessage 
                          ? 'You' 
                          : sender?.firstName && sender?.lastName
                            ? `${sender.firstName} ${sender.lastName}`
                            : sender?.username || 'Unknown'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>
                    <div className={`group relative px-4 py-2.5 rounded-2xl ${
                      isOwnMessage
                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                        : 'bg-card border border-border/50 rounded-bl-sm'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {msg.content}
                      </p>
                      {isOwnMessage && !String(msg._id).startsWith('temp-') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute -right-2 -top-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 rounded-full bg-background/80 hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => handleDeleteMessage(msg._id)}
                          disabled={deleteMessageMutation.isLoading}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        {isEditMode && (
          <form onSubmit={handleSendMessage} className="p-4 border-t border-border/50 bg-background">
            <div className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('chat.typeMessage')}
                className="flex-1 rounded-full border-2 focus:border-primary"
                maxLength={2000}
                disabled={sendMessageMutation.isLoading}
              />
              <Button
                type="submit"
                disabled={!message.trim() || sendMessageMutation.isLoading}
                className="rounded-full px-6 bg-primary hover:bg-primary/90 disabled:opacity-50"
              >
                {sendMessageMutation.isLoading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">
                {t('chat.charactersCount', { count: message.length })}
              </p>
              {!isConnected && (
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  {t('chat.reconnecting')}
                </p>
              )}
            </div>
          </form>
        )}
        {!isEditMode && (
          <div className="p-4 border-t border-border/50 bg-muted/30 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              {t('chat.clickEditToSend')}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditMode(true)}
              className="rounded-full"
            >
              <Edit2 className="h-4 w-4 me-2" />
              {t('chat.enableChat')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default GroupChat
