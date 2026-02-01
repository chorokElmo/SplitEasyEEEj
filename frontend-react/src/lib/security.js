/**
 * Security utilities for input sanitization and validation
 */

/**
 * Sanitize string input to prevent XSS attacks
 * @param {string} input - The input string to sanitize
 * @returns {string} - Sanitized string
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input
  
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim()
    .slice(0, 1000) // Limit length
}

/**
 * Sanitize email input
 * @param {string} email - Email to sanitize
 * @returns {string} - Sanitized email
 */
export const sanitizeEmail = (email) => {
  if (typeof email !== 'string') return ''
  
  return email
    .toLowerCase()
    .trim()
    .replace(/[<>]/g, '')
    .slice(0, 255)
}

/**
 * Sanitize numeric input
 * @param {string|number} input - Numeric input
 * @returns {number} - Sanitized number or 0
 */
export const sanitizeNumber = (input) => {
  const num = typeof input === 'string' ? parseFloat(input) : input
  if (isNaN(num) || !isFinite(num)) return 0
  return Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, num))
}

/**
 * Validate and sanitize username
 * @param {string} username - Username to validate
 * @returns {object} - { valid: boolean, sanitized: string, error: string }
 */
export const validateUsername = (username) => {
  if (!username || typeof username !== 'string') {
    return { valid: false, sanitized: '', error: 'Username is required' }
  }
  
  const sanitized = username.trim().slice(0, 30)
  
  if (sanitized.length < 3) {
    return { valid: false, sanitized, error: 'Username must be at least 3 characters' }
  }
  
  if (!/^[a-zA-Z0-9]+$/.test(sanitized)) {
    return { valid: false, sanitized, error: 'Username can only contain letters and numbers' }
  }
  
  return { valid: true, sanitized, error: null }
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} - { valid: boolean, strength: string, error: string }
 */
export const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return { valid: false, strength: 'weak', error: 'Password is required' }
  }
  
  if (password.length < 6) {
    return { valid: false, strength: 'weak', error: 'Password must be at least 6 characters' }
  }
  
  let strength = 'weak'
  if (password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)) {
    strength = 'strong'
  } else if (password.length >= 6) {
    strength = 'medium'
  }
  
  return { valid: true, strength, error: null }
}

/**
 * Sanitize object recursively
 * @param {object} obj - Object to sanitize
 * @returns {object} - Sanitized object
 */
export const sanitizeObject = (obj) => {
  if (obj === null || obj === undefined) return obj
  if (typeof obj !== 'object') return sanitizeInput(String(obj))
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item))
  }
  
  const sanitized = {}
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value)
    } else if (typeof value === 'number') {
      sanitized[key] = sanitizeNumber(value)
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value)
    } else {
      sanitized[key] = value
    }
  }
  
  return sanitized
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
export const escapeHtml = (text) => {
  if (typeof text !== 'string') return text
  
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  
  return text.replace(/[&<>"']/g, m => map[m])
}
