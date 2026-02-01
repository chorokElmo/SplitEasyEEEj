import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const PublicRoute = ({ component: Component }) => {
  const { user } = useAuth()
  
  if (user) {
    return <Navigate to="/dashboard" replace />
  }
  
  return <Component />
}

export default PublicRoute
