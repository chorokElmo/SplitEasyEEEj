import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageSquare } from 'lucide-react'
import { Button } from './ui/button'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import { useAuth } from '../contexts/AuthContext'

const ChatIcon = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [totalUnread, setTotalUnread] = useState(0)

  // Fetch unread message counts
  const { data: unreadData } = useQuery({
    queryKey: ['chat', 'unread-counts'],
    queryFn: async () => {
      const response = await api.get('/chat/unread-counts')
      return response.data.data.unreadCounts || {}
    },
    refetchInterval: 10000, // Check every 10 seconds
    enabled: !!user
  })

  // Calculate total unread messages
  useEffect(() => {
    if (!unreadData) {
      setTotalUnread(0)
      return
    }

    const total = Object.values(unreadData).reduce((sum, count) => sum + count, 0)
    setTotalUnread(total)
  }, [unreadData])

  const handleClick = () => {
    navigate('/chat')
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      className="relative rounded-full hover:bg-primary/10 transition-colors"
    >
      <MessageSquare className="h-5 w-5" />
      {totalUnread > 0 && (
        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white animate-pulse">
          {totalUnread > 9 ? '9+' : totalUnread}
        </span>
      )}
      <span className="sr-only">Open chat</span>
    </Button>
  )
}

export default ChatIcon
