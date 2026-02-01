import { Suspense, useEffect, lazy } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import PublicRoute from './components/PublicRoute'
import ErrorBoundary from './components/ErrorBoundary'
import DocumentHead from './components/DocumentHead'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import UXProcess from './pages/UXProcess'
import LoadingSpinner from './components/ui/loading-spinner'
import { setNavigate } from './lib/router'

// Lazy-load protected routes for smaller initial bundle
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ExpensesPage = lazy(() => import('./pages/ExpensesPage'))
const GroupsPage = lazy(() => import('./pages/GroupsPage'))
const EditGroupPage = lazy(() => import('./pages/EditGroupPage'))
const ChatPage = lazy(() => import('./pages/ChatPage'))
const FriendsPage = lazy(() => import('./pages/FriendsPage'))
const SettlePage = lazy(() => import('./pages/SettlePage'))
const WalletsPage = lazy(() => import('./pages/WalletsPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'))

const RouteFallback = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
    <LoadingSpinner size="lg" />
    <p className="text-sm text-muted-foreground">Loading...</p>
  </div>
)

function App() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    setNavigate(navigate)
    return () => setNavigate(null)
  }, [navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background text-foreground" style={{ backgroundColor: 'hsl(0 0% 98%)', color: 'hsl(222.2 84% 4.9%)' }}>
        <LoadingSpinner size="lg" />
        <p className="text-sm font-medium">SplitEasy is loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <DocumentHead />
      <Routes>
      {/* Public routes - Landing page appears first when not logged in */}
      <Route
        path="/"
        element={<PublicRoute component={LandingPage} />}
      />
      <Route
        path="/login"
        element={<PublicRoute component={LoginPage} />}
      />
      <Route
        path="/signup"
        element={<PublicRoute component={SignupPage} />}
      />
      <Route
        path="/ux-process"
        element={<UXProcess />}
      />

      {/* Protected routes - wrapped in ProtectedRoute component */}
      <Route element={<ProtectedRoute />}>
        <Route
          path="dashboard"
          element={
            <ErrorBoundary>
              <Suspense fallback={<RouteFallback />}>
                <DashboardPage />
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="expenses"
          element={
            <ErrorBoundary>
              <Suspense fallback={<RouteFallback />}>
                <ExpensesPage />
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="groups"
          element={
            <ErrorBoundary>
              <Suspense fallback={<RouteFallback />}>
                <GroupsPage />
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="groups/:id/edit"
          element={
            <ErrorBoundary>
              <Suspense fallback={<RouteFallback />}>
                <EditGroupPage />
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="chat"
          element={
            <ErrorBoundary>
              <Suspense fallback={<RouteFallback />}>
                <ChatPage />
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="friends"
          element={
            <ErrorBoundary>
              <Suspense fallback={<RouteFallback />}>
                <FriendsPage />
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="settle"
          element={
            <ErrorBoundary>
              <Suspense fallback={<RouteFallback />}>
                <SettlePage />
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="wallets"
          element={
            <ErrorBoundary>
              <Suspense fallback={<RouteFallback />}>
                <WalletsPage />
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="profile"
          element={
            <ErrorBoundary>
              <Suspense fallback={<RouteFallback />}>
                <ProfilePage />
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="analytics"
          element={
            <ErrorBoundary>
              <Suspense fallback={<RouteFallback />}>
                <AnalyticsPage />
              </Suspense>
            </ErrorBoundary>
          }
        />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/'} replace />} />
    </Routes>
    </div>
  )
}

export default App
