import { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react'
import api from '../lib/api'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const logoutRef = useRef()

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token')
      const savedUser = localStorage.getItem('user')
      
      if (token && savedUser) {
        try {
          setUser(JSON.parse(savedUser))
          await api.get('/auth/me')
        } catch (error) {
          console.error('Token validation failed:', error)
          logoutRef.current()
        }
      }
      setLoading(false)
    }

    initAuth()
  }, [])

  const login = useCallback(async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password })
      const { token, user: userData } = response.data.data
      
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(userData))
      setUser(userData)
      
      return { success: true }
    } catch (error) {
      // Handle network errors
      if (!error.response) {
        return { 
          success: false, 
          error: error.message || 'Cannot connect to server. Please make sure the backend is running.'
        }
      }
      return { 
        success: false, 
        error: error.response?.data?.message || 'Login failed' 
      }
    }
  }, [])

  const register = useCallback(async (userData) => {
    try {
      // Clean up empty optional fields - don't send empty strings
      const cleanedData = { ...userData }
      if (!cleanedData.firstName || cleanedData.firstName.trim() === '') {
        delete cleanedData.firstName
      }
      if (!cleanedData.lastName || cleanedData.lastName.trim() === '') {
        delete cleanedData.lastName
      }
      if (!cleanedData.phone || cleanedData.phone.trim() === '') {
        delete cleanedData.phone
      }
      
      const response = await api.post('/auth/register', cleanedData)
      return { success: true, data: response.data }
    } catch (error) {
      // Handle network errors
      if (!error.response) {
        return { 
          success: false, 
          error: error.message || 'Cannot connect to server. Please make sure the backend is running.'
        }
      }
      
      // Handle validation errors from backend
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        const errorMessages = error.response.data.errors.map(e => e.message).join(', ')
        return { 
          success: false, 
          error: errorMessages || error.response?.data?.message || 'Registration failed'
        }
      }
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || 'Registration failed' 
      }
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }, [])

  logoutRef.current = logout

  const updateUser = useCallback((userData) => {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
  }, [])

  const value = useMemo(() => ({
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
  }), [user, loading, login, register, logout, updateUser])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContext