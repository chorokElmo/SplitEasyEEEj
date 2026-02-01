import { useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { 
  LayoutDashboard, 
  Receipt, 
  Users, 
  UserPlus, 
  CreditCard, 
  User,
  LogOut,
  BarChart3,
  DollarSign,
  X
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { cn } from '../lib/utils'

const Sidebar = ({ isOpen = false, onClose }) => {
  const { logout } = useAuth()
  const { t, i18n } = useTranslation()
  const isRtl = i18n.language === 'ar'

  const navigation = useMemo(() => [
    { name: t('nav.dashboard'), href: '/dashboard', icon: LayoutDashboard },
    { name: t('nav.expenses'), href: '/expenses', icon: Receipt },
    { name: t('nav.groups'), href: '/groups', icon: Users },
    { name: t('nav.friends'), href: '/friends', icon: UserPlus },
    { name: t('nav.settle'), href: '/settle', icon: CreditCard },
    { name: t('nav.analytics'), href: '/analytics', icon: BarChart3 },
    { name: t('nav.profile'), href: '/profile', icon: User },
  ], [t])

  return (
    <aside
      className={cn(
        'fixed lg:static inset-y-0 z-50 w-64 h-screen flex flex-col border-r border-border transition-[transform,background-color] duration-300 ease-in-out',
        'bg-card dark:bg-card',
        isRtl ? 'right-0 left-auto border-l border-border' : 'left-0 border-r border-border',
        isOpen ? 'translate-x-0' : isRtl ? 'translate-x-full lg:translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}
    >
      {/* Logo + close button on mobile */}
      <div className="p-4 sm:p-6 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 shrink-0 rounded-2xl bg-primary flex items-center justify-center shadow-soft">
            <DollarSign className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="text-h2 font-semibold text-foreground truncate">
              {t('app.title')}
            </h1>
            <p className="text-small text-muted-foreground hidden sm:block">{t('app.subtitle')}</p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            aria-label="Close menu"
            className="lg:hidden p-2 rounded-2xl hover:bg-accent dark:hover:bg-white/10 text-muted-foreground transition-colors duration-200"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 sm:p-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                "flex items-center px-3 sm:px-4 py-3 rounded-2xl text-small font-medium transition-all duration-200 group",
                isActive
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent dark:hover:bg-white/10"
              )
            }
          >
            <item.icon className={cn(
              "me-3 h-5 w-5 shrink-0 transition-transform group-hover:scale-110",
              "group-[.active]:text-white"
            )} />
            <span className="truncate">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 sm:p-4 border-t border-border">
        <button
          onClick={logout}
          className="flex items-center w-full px-3 sm:px-4 py-3 text-small font-medium text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20 rounded-2xl transition-all duration-200 group"
        >
          <LogOut className="me-3 h-5 w-5 shrink-0 group-hover:scale-110 transition-transform" />
          {t('nav.logout')}
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
