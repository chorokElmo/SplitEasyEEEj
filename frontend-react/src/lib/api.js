import axios from 'axios'
import { getNavigate } from './router'

// Use env in build so production can override without code change; fallback for dev
const getApiUrl = () => {
  const env = import.meta.env.VITE_API_URL
  if (env && typeof env === 'string' && env.length > 0) return env.replace(/\/$/, '')
  return "http://localhost:8000/api"
}

export const API_URL = getApiUrl()

/**
 * Build WebSocket URL for chat. Uses VITE_WS_URL if set, otherwise derives from API_URL.
 * Backend serves WS on same host at /api/chat/ws.
 */
export function getChatWebSocketUrl() {
  const env = import.meta.env.VITE_WS_URL
  if (env && typeof env === 'string' && env.trim().length > 0) {
    return env.trim().replace(/\/$/, '')
  }
  const base = API_URL.replace(/\/api\/?$/, '').trim()
  const scheme = base.startsWith('https') ? 'wss' : 'ws'
  const host = base.replace(/^https?:\/\//, '').replace(/\/+$/, '')
  return `${scheme}://${host}`
}

// Log API URL for debugging (only in development)
if (import.meta.env.DEV) {
  console.log('🌐 API Base URL:', API_URL)
}

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // Increased timeout to 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // Don't send cookies for CORS
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle network errors
    if (!error.response) {
      console.error('Network Error:', error.message)
      // Check if it's a connection error
      if (error.code === 'ECONNABORTED') {
        error.message = 'Request timeout. Please check your connection and try again.'
      } else if (error.message.includes('Network Error') || error.code === 'ERR_NETWORK') {
        error.message = 'Cannot connect to server. Please check your connection and try again.'
      }
    }
    
    // Handle auth errors - use React Router navigate when available to avoid full reload
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      const navigate = getNavigate()
      if (navigate && window.location.pathname !== '/login') {
        navigate('/login')
      } else if (!navigate && window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    
    return Promise.reject(error)
  }
)

export default api