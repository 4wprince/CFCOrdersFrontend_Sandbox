/**
 * syncHelpers.js
 * Helper functions for syncing data with backend
 * v5.9.1 - Modular helper file
 */

/**
 * Sync AI summaries for all active orders
 * @param {string} apiUrl - Base API URL
 * @param {boolean} includeArchived - Whether to include archived orders
 * @returns {Promise<Object>} Sync results
 */
export const syncAllAISummaries = async (apiUrl, includeArchived = false) => {
  try {
    const url = `${apiUrl}/orders/regenerate-summaries?include_archived=${includeArchived}`
    const response = await fetch(url, { method: 'POST' })
    
    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status}`)
    }
    
    const data = await response.json()
    return {
      success: true,
      data: data.results,
      message: `Synced ${data.results?.success || 0} of ${data.results?.total || 0} orders`
    }
  } catch (err) {
    console.error('AI sync failed:', err)
    return {
      success: false,
      error: err.message,
      message: 'Failed to sync AI summaries'
    }
  }
}

/**
 * Sync AI summary for a single order
 * @param {string} apiUrl - Base API URL
 * @param {string} orderId - Order ID to sync
 * @returns {Promise<Object>} Sync result
 */
export const syncOrderAISummary = async (apiUrl, orderId) => {
  try {
    const response = await fetch(`${apiUrl}/orders/${orderId}/regenerate-summary`, {
      method: 'POST'
    })
    
    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status}`)
    }
    
    const data = await response.json()
    return {
      success: true,
      summary: data.summary,
      hasCritical: data.has_critical,
      criticalComments: data.critical_comments
    }
  } catch (err) {
    console.error('Order AI sync failed:', err)
    return {
      success: false,
      error: err.message
    }
  }
}

/**
 * Trigger Gmail sync
 * @param {string} apiUrl - Base API URL
 * @param {number} hoursBack - Hours to look back for emails
 * @returns {Promise<Object>} Sync results
 */
export const syncGmail = async (apiUrl, hoursBack = 2) => {
  try {
    const response = await fetch(`${apiUrl}/gmail/sync?hours_back=${hoursBack}`, {
      method: 'POST'
    })
    
    if (!response.ok) {
      throw new Error(`Gmail sync failed: ${response.status}`)
    }
    
    const data = await response.json()
    return {
      success: true,
      data: data.results
    }
  } catch (err) {
    console.error('Gmail sync failed:', err)
    return {
      success: false,
      error: err.message
    }
  }
}

/**
 * Trigger B2BWave sync
 * @param {string} apiUrl - Base API URL
 * @param {number} daysBack - Days to look back for orders
 * @returns {Promise<Object>} Sync results
 */
export const syncB2BWave = async (apiUrl, daysBack = 14) => {
  try {
    const response = await fetch(`${apiUrl}/b2bwave/sync?days_back=${daysBack}`, {
      method: 'POST'
    })
    
    if (!response.ok) {
      throw new Error(`B2BWave sync failed: ${response.status}`)
    }
    
    const data = await response.json()
    return {
      success: true,
      data: data
    }
  } catch (err) {
    console.error('B2BWave sync failed:', err)
    return {
      success: false,
      error: err.message
    }
  }
}

/**
 * Update order status via set-status endpoint
 * @param {string} apiUrl - Base API URL
 * @param {string} orderId - Order ID
 * @param {string} newStatus - New status value
 * @returns {Promise<Object>} Update result
 */
export const updateOrderStatus = async (apiUrl, orderId, newStatus) => {
  try {
    const response = await fetch(
      `${apiUrl}/orders/${orderId}/set-status?status=${newStatus}&source=web_ui`,
      { method: 'PATCH' }
    )
    
    if (!response.ok) {
      const text = await response.text()
      throw new Error(text || `Update failed: ${response.status}`)
    }
    
    return { success: true }
  } catch (err) {
    console.error('Status update failed:', err)
    return {
      success: false,
      error: err.message
    }
  }
}

/**
 * Cancel an order
 * @param {string} apiUrl - Base API URL
 * @param {string} orderId - Order ID to cancel
 * @returns {Promise<Object>} Cancel result
 */
export const cancelOrder = async (apiUrl, orderId) => {
  try {
    // First set status to canceled
    const statusResult = await updateOrderStatus(apiUrl, orderId, 'canceled')
    if (!statusResult.success) {
      throw new Error(statusResult.error)
    }
    
    // Then mark as complete to archive it
    const response = await fetch(`${apiUrl}/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        is_complete: true,
        is_canceled: true,
        notes_append: '\n[CANCELED via UI]'
      })
    })
    
    if (!response.ok) {
      throw new Error(`Archive failed: ${response.status}`)
    }
    
    return { success: true }
  } catch (err) {
    console.error('Cancel order failed:', err)
    return {
      success: false,
      error: err.message
    }
  }
}

/**
 * Update shipment status
 * @param {string} apiUrl - Base API URL
 * @param {string} shipmentId - Shipment ID
 * @param {string} status - New status
 * @returns {Promise<Object>} Update result
 */
export const updateShipmentStatus = async (apiUrl, shipmentId, status) => {
  try {
    const response = await fetch(`${apiUrl}/shipments/${shipmentId}?status=${status}`, {
      method: 'PATCH'
    })
    
    if (!response.ok) {
      throw new Error(`Update failed: ${response.status}`)
    }
    
    return { success: true }
  } catch (err) {
    console.error('Shipment status update failed:', err)
    return {
      success: false,
      error: err.message
    }
  }
}

/**
 * Update shipment method
 * @param {string} apiUrl - Base API URL
 * @param {string} shipmentId - Shipment ID
 * @param {string} method - New shipping method
 * @returns {Promise<Object>} Update result
 */
export const updateShipmentMethod = async (apiUrl, shipmentId, method) => {
  try {
    const response = await fetch(`${apiUrl}/shipments/${shipmentId}?ship_method=${method}`, {
      method: 'PATCH'
    })
    
    if (!response.ok) {
      throw new Error(`Update failed: ${response.status}`)
    }
    
    return { success: true }
  } catch (err) {
    console.error('Shipment method update failed:', err)
    return {
      success: false,
      error: err.message
    }
  }
}

/**
 * Save tracking number and update status to shipped
 * @param {string} apiUrl - Base API URL
 * @param {string} shipmentId - Shipment ID
 * @param {string} trackingNumber - Tracking number
 * @returns {Promise<Object>} Update result
 */
export const saveTrackingNumber = async (apiUrl, shipmentId, trackingNumber) => {
  try {
    // Save tracking
    let response = await fetch(
      `${apiUrl}/shipments/${shipmentId}?tracking_number=${encodeURIComponent(trackingNumber)}`,
      { method: 'PATCH' }
    )
    
    if (!response.ok) {
      throw new Error(`Save tracking failed: ${response.status}`)
    }
    
    // Update status to shipped
    response = await fetch(`${apiUrl}/shipments/${shipmentId}?status=shipped`, {
      method: 'PATCH'
    })
    
    if (!response.ok) {
      throw new Error(`Status update failed: ${response.status}`)
    }
    
    return { success: true }
  } catch (err) {
    console.error('Save tracking failed:', err)
    return {
      success: false,
      error: err.message
    }
  }
}
