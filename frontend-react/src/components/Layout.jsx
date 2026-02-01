import { memo, useState, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const openSidebar = useCallback(() => setSidebarOpen(true), [])
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])

  return (
    <div className="min-h-screen bg-background transition-colors duration-theme">
      {/* Mobile overlay - closes sidebar when tapping outside */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 bg-black/50 dark:bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={closeSidebar}
        />
      )}
      <div className="flex">
        <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
        <div className="flex-1 flex flex-col min-w-0">
          <Header onMenuClick={openSidebar} />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-muted/20 dark:bg-muted/10 transition-colors duration-theme">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}

export default memo(Layout)
