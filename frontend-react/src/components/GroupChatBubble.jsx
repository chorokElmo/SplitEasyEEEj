import { useState } from 'react'
import { MessageSquare, X } from 'lucide-react'
import GroupChat from './GroupChat'
import { Button } from './ui/button'
import { cn } from '../lib/utils'

/**
 * Floating chat bubble that opens GroupChat in a popover panel.
 * Use on Edit Group page so the main content is only group name + members.
 */
const GroupChatBubble = ({ groupId, groupTitle }) => {
  const [open, setOpen] = useState(false)

  if (!groupId) return null

  return (
    <>
      {/* Floating bubble button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close chat' : 'Open group chat'}
        className={cn(
          'fixed bottom-6 end-6 z-50 flex items-center justify-center',
          'w-14 h-14 rounded-full shadow-lg transition-all duration-200',
          'bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-110',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background'
        )}
      >
        <MessageSquare className="h-6 w-6" />
      </button>

      {/* Chat panel - slides in from bottom-right */}
      {open && (
        <div
          className="fixed bottom-24 end-6 z-50 w-[min(calc(100vw-3rem),380px)] rounded-2xl shadow-2xl border border-border bg-card overflow-hidden flex flex-col"
          style={{ height: 'min(520px, 75vh)' }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <span className="font-semibold text-foreground truncate">
              {groupTitle} – Chat
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close chat"
              className="shrink-0 rounded-full h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <GroupChat
              groupId={groupId}
              groupTitle={groupTitle}
              showEditToggle={false}
              compact
            />
          </div>
        </div>
      )}
    </>
  )
}

export default GroupChatBubble
