import { Search, Menu, Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { getInitials, getAvatarColor } from '../lib/utils'
import LanguageSwitcher from './LanguageSwitcher'
import ChatIcon from './ChatIcon'
import Notifications from './Notifications'
import { useNavigate } from 'react-router-dom'

const Header = ({ onMenuClick }) => {
  const { user } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { dark, toggleTheme } = useTheme()

  return (
    <header className="sticky top-0 z-10 border-b border-border/60 bg-card/95 dark:bg-card/90 backdrop-blur-md px-3 sm:px-6 py-3 sm:py-4 shadow-soft rounded-b-2xl transition-colors duration-theme">
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Hamburger - mobile/tablet only */}
        {onMenuClick && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open menu"
            className="lg:hidden shrink-0 rounded-2xl hover:bg-accent dark:hover:bg-white/10 transition-colors duration-200"
            onClick={onMenuClick}
          >
            <Menu className="h-6 w-6" />
          </Button>
        )}

        {/* Search - hidden on small, full width on md+ */}
        <div className="flex-1 min-w-0 max-w-md hidden sm:block">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              placeholder={t('common.search') + ' expenses, groups, friends...'}
              className="ps-10 rounded-2xl border-border focus:border-primary focus:ring-2 focus:ring-ring w-full transition-all duration-200"
            />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-1 sm:gap-3 ms-auto shrink-0">
          <Button
            variant="ghost"
            size="icon"
            aria-label={dark ? t('theme.switchToLight') : t('theme.switchToDark')}
            className="rounded-2xl hover:bg-accent dark:hover:bg-white/10 transition-colors duration-200"
            onClick={toggleTheme}
          >
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <LanguageSwitcher />
          <ChatIcon />
          <Notifications />

          <button
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2 sm:gap-3 hover:bg-accent dark:hover:bg-white/10 rounded-2xl px-2 sm:px-3 py-2 transition-colors duration-200 min-w-0"
          >
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center text-white text-small font-semibold shadow-soft shrink-0 ${getAvatarColor(user?.username || 'User')}`}>
              {getInitials(user?.username || 'User')}
            </div>
            <div className="hidden md:block text-start min-w-0">
              <p className="text-small font-semibold text-foreground truncate">{user?.username}</p>
              <p className="text-small text-muted-foreground truncate">{user?.email}</p>
            </div>
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header
