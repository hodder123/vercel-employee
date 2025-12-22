const rateLimitMap = new Map()

export function rateLimit(identifier) {
  const now = Date.now()
  const windowMs = 15 * 60 * 1000 // 15 minutes
  const maxAttempts = 5

  if (!rateLimitMap.has(identifier)) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs })
    return { success: true }
  }

  const record = rateLimitMap.get(identifier)

  if (now > record.resetTime) {
    // Window expired, reset
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs })
    return { success: true }
  }

  if (record.count >= maxAttempts) {
    const timeLeft = Math.ceil((record.resetTime - now) / 1000 / 60)
    return { 
      success: false, 
      message: `Too many login attempts. Please try again in ${timeLeft} minutes.` 
    }
  }

  record.count++
  return { success: true }
}

// Clean up old entries every hour
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key)
    }
  }
}, 60 * 60 * 1000)