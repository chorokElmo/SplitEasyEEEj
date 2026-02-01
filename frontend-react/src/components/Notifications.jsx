import { useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, UserPlus, Users, Receipt } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from './ui/button'
import api from '../lib/api'
import { playNotificationSound } from '../lib/sound'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { useAuth } from '../contexts/AuthContext'

const Notifications = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications')
      return res.data?.data || { notifications: [], unreadCount: 0 }
    },
    enabled: !!user,
    refetchInterval: 15000,
  })

  const markReadMutation = useMutation({
    mutationFn: (id) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const notifications = data?.notifications || []
  const unreadCount = data?.unreadCount ?? 0
  const prevUnreadRef = useRef(unreadCount)
  const isFirstLoad = useRef(true)

  // Play sound when new notifications arrive (unread count increases)
  useEffect(() => {
    if (isLoading || !data) return
    if (isFirstLoad.current) {
      isFirstLoad.current = false
      prevUnreadRef.current = unreadCount
      return
    }
    if (unreadCount > prevUnreadRef.current) {
      playNotificationSound()
    }
    prevUnreadRef.current = unreadCount
  }, [unreadCount, isLoading, data])

  const getIcon = (type) => {
    if (type === 'friend_request') return UserPlus
    if (type === 'member_added') return Users
    if (type === 'expense_added' || type === 'expense_updated') return Receipt
    return Bell
  }

  const getLink = (n) => {
    if (n.type === 'friend_request') return '/friends'
    if (n.type === 'member_added' && n.relatedId) return `/groups/${n.relatedId}/edit`
    if ((n.type === 'expense_added' || n.type === 'expense_updated') && n.relatedId) return '/expenses'
    return null
  }

  const handleNotificationClick = (n) => {
    if (!n.isRead) markReadMutation.mutate(n._id)
    const link = getLink(n)
    if (link) navigate(link)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-xl hover:bg-primary/10 transition-colors"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 end-1 flex h-5 w-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          <span className="sr-only">{t('notifications.title')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-[70vh] overflow-hidden flex flex-col">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <span className="font-semibold">{t('notifications.title')}</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              {t('notifications.markAllRead')}
            </Button>
          )}
        </div>
        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {t('common.loading')}
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              {t('notifications.noNotifications')}
            </div>
          ) : (
            <ul className="py-1">
              {notifications.map((n) => {
                const Icon = getIcon(n.type)
                return (
                  <li key={n._id}>
                    <button
                      type="button"
                      onClick={() => handleNotificationClick(n)}
                      className={`w-full text-start px-3 py-2.5 flex gap-3 items-start hover:bg-accent transition-colors ${!n.isRead ? 'bg-primary/5' : ''}`}
                    >
                      <div className="shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{n.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default Notifications
