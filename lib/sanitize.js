export function sanitizeInput(input) {
  if (typeof input !== 'string') return input
  
  // Remove any HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '')
  
  // Remove potential XSS patterns
  sanitized = sanitized.replace(/javascript:/gi, '')
  sanitized = sanitized.replace(/on\w+=/gi, '')
  
  // Trim whitespace
  sanitized = sanitized.trim()
  
  return sanitized
}

export function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) return obj
  
  const sanitized = Array.isArray(obj) ? [] : {}
  
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      sanitized[key] = sanitizeInput(obj[key])
    } else if (typeof obj[key] === 'object') {
      sanitized[key] = sanitizeObject(obj[key])
    } else {
      sanitized[key] = obj[key]
    }
  }
  
  return sanitized
}