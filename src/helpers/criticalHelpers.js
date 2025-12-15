/**
 * criticalHelpers.js
 * Helper functions for detecting and highlighting critical comments
 * v5.9.1 - Modular helper file
 */

// Critical patterns that need red highlighting
const CRITICAL_PATTERNS = [
  // Address changes
  { pattern: /address.*(different|change|new|correct)/i, type: 'ADDRESS_CHANGE', label: 'Address Change' },
  { pattern: /ship\s*to\s*(different|another|new)/i, type: 'ADDRESS_CHANGE', label: 'Address Change' },
  { pattern: /(different|new|correct)\s*address/i, type: 'ADDRESS_CHANGE', label: 'Address Change' },
  
  // Order modifications
  { pattern: /add.*(to|this)\s*order/i, type: 'ORDER_MODIFICATION', label: 'Order Change' },
  { pattern: /(forgot|need)\s*to\s*(add|include)/i, type: 'ORDER_MODIFICATION', label: 'Order Change' },
  { pattern: /change\s*\w+\s*to\s*\w+/i, type: 'ORDER_MODIFICATION', label: 'Product Swap' },
  { pattern: /swap|replace|substitute/i, type: 'ORDER_MODIFICATION', label: 'Product Swap' },
  
  // Combined orders
  { pattern: /(goes|combine|ship)\s*with.*(order|earlier|previous)/i, type: 'COMBINED_ORDER', label: 'Combined Order' },
  { pattern: /(earlier|previous|other)\s*order/i, type: 'COMBINED_ORDER', label: 'Combined Order' },
  { pattern: /combine\s*(these|orders|shipment)/i, type: 'COMBINED_ORDER', label: 'Combined Order' },
  
  // Hold/Cancel
  { pattern: /don'?t\s*ship/i, type: 'HOLD_ORDER', label: 'Hold Order' },
  { pattern: /hold\s*(order|shipment|off)/i, type: 'HOLD_ORDER', label: 'Hold Order' },
  { pattern: /cancel/i, type: 'CANCEL_ORDER', label: 'Cancel' },
  { pattern: /wait\s*(until|for|before)/i, type: 'HOLD_ORDER', label: 'Wait' },
  
  // Delivery instructions
  { pattern: /liftgate/i, type: 'DELIVERY_INSTRUCTION', label: 'Liftgate' },
  { pattern: /call\s*(before|when|prior)/i, type: 'DELIVERY_INSTRUCTION', label: 'Call Required' },
  { pattern: /appointment\s*(only|required|needed)/i, type: 'DELIVERY_INSTRUCTION', label: 'Appointment' },
  { pattern: /residential/i, type: 'DELIVERY_INSTRUCTION', label: 'Residential' },
  
  // Payment
  { pattern: /(check|cash)\s*(on|at)\s*(delivery|pickup)/i, type: 'PAYMENT_INSTRUCTION', label: 'COD' },
  { pattern: /pay\s*(when|at|on)\s*(pickup|delivery)/i, type: 'PAYMENT_INSTRUCTION', label: 'Pay at Pickup' }
]

/**
 * Detect critical comments in text
 * @param {string} text - Text to scan
 * @returns {Array} List of detected critical patterns
 */
export const detectCriticalComments = (text) => {
  if (!text) return []
  
  const found = []
  
  for (const { pattern, type, label } of CRITICAL_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      found.push({
        type,
        label,
        matchedText: match[0],
        index: match.index
      })
    }
  }
  
  return found
}

/**
 * Check if text contains any critical patterns
 * @param {string} text - Text to check
 * @returns {boolean} Whether critical patterns were found
 */
export const hasCriticalComments = (text) => {
  if (!text) return false
  return detectCriticalComments(text).length > 0
}

/**
 * Get critical badges for display
 * @param {string} text - Text to scan
 * @returns {Array} Unique labels for display
 */
export const getCriticalBadges = (text) => {
  if (!text) return []
  
  const found = detectCriticalComments(text)
  const uniqueLabels = [...new Set(found.map(f => f.label))]
  return uniqueLabels
}

/**
 * Highlight critical text in comments
 * Returns React elements with highlighted portions
 * @param {string} text - Text to process
 * @returns {Array} Array of text/highlight segments
 */
export const highlightCriticalText = (text) => {
  if (!text) return [{ text: '', isCritical: false }]
  
  const found = detectCriticalComments(text)
  
  if (found.length === 0) {
    return [{ text, isCritical: false }]
  }
  
  // Sort by index
  found.sort((a, b) => a.index - b.index)
  
  const segments = []
  let lastEnd = 0
  
  for (const match of found) {
    // Add text before this match
    if (match.index > lastEnd) {
      segments.push({
        text: text.slice(lastEnd, match.index),
        isCritical: false
      })
    }
    
    // Add the critical match
    segments.push({
      text: match.matchedText,
      isCritical: true,
      type: match.type,
      label: match.label
    })
    
    lastEnd = match.index + match.matchedText.length
  }
  
  // Add remaining text
  if (lastEnd < text.length) {
    segments.push({
      text: text.slice(lastEnd),
      isCritical: false
    })
  }
  
  return segments
}

/**
 * CSS style for critical text
 */
export const criticalTextStyle = {
  color: '#d32f2f',
  fontWeight: '600',
  backgroundColor: '#ffebee',
  padding: '2px 4px',
  borderRadius: '3px'
}

/**
 * CSS style for critical badge
 */
export const criticalBadgeStyle = {
  display: 'inline-block',
  backgroundColor: '#d32f2f',
  color: '#fff',
  fontSize: '10px',
  fontWeight: '600',
  padding: '2px 6px',
  borderRadius: '10px',
  marginRight: '4px',
  textTransform: 'uppercase'
}

/**
 * Check if order has critical comments (from ai_summary_critical field)
 * @param {Object} order - Order object
 * @returns {boolean} Whether order has critical flags
 */
export const orderHasCriticalFlags = (order) => {
  if (!order) return false
  
  // Check ai_summary_critical field (JSON from backend)
  if (order.ai_summary_critical) {
    try {
      const critical = JSON.parse(order.ai_summary_critical)
      return Array.isArray(critical) && critical.length > 0
    } catch {
      return false
    }
  }
  
  // Fallback: check comments and notes directly
  const allText = (order.comments || '') + ' ' + (order.notes || '')
  return hasCriticalComments(allText)
}

/**
 * Get critical types from order
 * @param {Object} order - Order object
 * @returns {Array} List of critical types
 */
export const getOrderCriticalTypes = (order) => {
  if (!order) return []
  
  // Check ai_summary_critical field first
  if (order.ai_summary_critical) {
    try {
      const critical = JSON.parse(order.ai_summary_critical)
      if (Array.isArray(critical)) {
        return critical.map(c => c.type || c)
      }
    } catch {
      // Fall through to manual detection
    }
  }
  
  // Fallback: detect from text
  const allText = (order.comments || '') + ' ' + (order.notes || '')
  return detectCriticalComments(allText).map(c => c.type)
}
