/**
 * addressHelpers.js
 * Helper functions for formatting and displaying customer addresses
 * v5.9.1 - Modular helper file
 */

/**
 * Format full street address including unit/suite
 * @param {Object} order - Order object with address fields
 * @returns {string} Formatted street address
 */
export const formatStreetAddress = (order) => {
  if (!order) return ''
  
  const street = order.street || order.shipping_street || ''
  const unit = order.unit || order.suite || order.apt || order.shipping_unit || ''
  
  if (!street) return ''
  if (!unit) return street
  
  // Check if unit info is already in street
  const streetLower = street.toLowerCase()
  const unitLower = unit.toLowerCase()
  
  if (streetLower.includes(unitLower)) return street
  if (streetLower.includes('unit') || streetLower.includes('suite') || streetLower.includes('apt')) {
    return street
  }
  
  // Determine prefix for unit
  let prefix = ''
  if (/^\d+$/.test(unit)) {
    // Just a number, add "Unit"
    prefix = 'Unit '
  } else if (!unit.toLowerCase().startsWith('unit') && 
             !unit.toLowerCase().startsWith('suite') && 
             !unit.toLowerCase().startsWith('apt') &&
             !unit.startsWith('#')) {
    // No prefix, add one
    prefix = 'Unit '
  }
  
  return `${street}, ${prefix}${unit}`
}

/**
 * Format city, state, zip line
 * @param {Object} order - Order object with address fields
 * @returns {string} Formatted city line
 */
export const formatCityLine = (order) => {
  if (!order) return ''
  
  const city = order.city || ''
  const state = order.state || ''
  const zip = order.zip_code || order.zip || ''
  
  if (!city && !state) return zip
  if (!zip) return `${city}, ${state}`.replace(/^, |, $/g, '')
  
  return `${city}, ${state} ${zip}`.trim()
}

/**
 * Get display location (city, state) for order card
 * @param {Object} order - Order object
 * @returns {string} Location string
 */
export const getDisplayLocation = (order) => {
  if (!order) return ''
  
  const city = order.city || ''
  const state = order.state || ''
  
  if (!city && !state) return ''
  if (!city) return state
  if (!state) return city
  
  return `${city}, ${state}`
}

/**
 * Get customer display name (company or personal name)
 * @param {Object} order - Order object
 * @returns {string} Customer name
 */
export const getCustomerName = (order) => {
  if (!order) return 'Unknown'
  return order.company_name || order.customer_name || 'Unknown'
}

/**
 * Format full address block for display
 * @param {Object} order - Order object
 * @returns {Object} Formatted address components
 */
export const getFormattedAddress = (order) => {
  if (!order) return { name: '', street: '', cityLine: '', phone: '', email: '' }
  
  return {
    name: getCustomerName(order),
    street: formatStreetAddress(order),
    cityLine: formatCityLine(order),
    phone: order.phone || '',
    email: order.email || ''
  }
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
export const copyToClipboard = async (text) => {
  if (!text) return false
  
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (err) {
    console.error('Failed to copy:', err)
    return false
  }
}

/**
 * Format phone number for display
 * @param {string} phone - Raw phone number
 * @returns {string} Formatted phone
 */
export const formatPhone = (phone) => {
  if (!phone) return ''
  
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '')
  
  // Format as (XXX) XXX-XXXX if 10 digits
  if (digits.length === 10) {
    return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`
  }
  
  // Format as X-XXX-XXX-XXXX if 11 digits (with country code)
  if (digits.length === 11) {
    return `${digits[0]}-${digits.slice(1,4)}-${digits.slice(4,7)}-${digits.slice(7)}`
  }
  
  // Return original if can't format
  return phone
}
