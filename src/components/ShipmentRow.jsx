/**
 * ShipmentRow.jsx
 * Display a single warehouse shipment with status, method, and actions
 * v5.9.3 - Send tracking via B2BWave API (auto-emails customer)
 */

import { useState } from 'react'
import { API_URL } from '../config'

// Backend status values
const STATUS_OPTIONS = [
  { value: 'needs_order', label: 'Pending' },
  { value: 'at_warehouse', label: 'At Warehouse' },
  { value: 'needs_bol', label: 'Needs BOL' },
  { value: 'ready_ship', label: 'Ready Ship' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' }
]

const METHOD_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'LTL', label: 'LTL' },
  { value: 'Pirateship', label: 'Pirateship' },
  { value: 'Pickup', label: 'Pickup' },
  { value: 'BoxTruck', label: 'BoxTruck' },
  { value: 'LiDelivery', label: 'Li_Delivery' }
]

const ShipmentRow = ({ 
  shipment, 
  order,
  onOpenShippingManager,
  onUpdate 
}) => {
  const [updating, setUpdating] = useState(false)
  const [showTrackingInput, setShowTrackingInput] = useState(false)
  const [trackingNumber, setTrackingNumber] = useState(shipment.tracking_number || '')
  const [sendStatus, setSendStatus] = useState(null) // 'sending', 'success', 'error'
  
  const handleStatusChange = async (e) => {
    const newStatus = e.target.value
    setUpdating(true)
    try {
      await fetch(`${API_URL}/shipments/${shipment.shipment_id}?status=${newStatus}`, {
        method: 'PATCH'
      })
      if (onUpdate) onUpdate()
    } catch (err) {
      console.error('Failed to update status:', err)
    }
    setUpdating(false)
  }
  
  const handleMethodChange = async (e) => {
    const newMethod = e.target.value
    setUpdating(true)
    try {
      await fetch(`${API_URL}/shipments/${shipment.shipment_id}?ship_method=${newMethod}`, {
        method: 'PATCH'
      })
      if (onUpdate) onUpdate()
      
      // Open shipping manager for methods that need helpers
      if (newMethod && newMethod !== 'Pickup') {
        onOpenShippingManager(shipment)
      }
    } catch (err) {
      console.error('Failed to update method:', err)
    }
    setUpdating(false)
  }
  
  // Send tracking via B2BWave API (auto-emails customer)
  const handleSaveAndSendTracking = async () => {
    if (!trackingNumber.trim()) return
    
    const orderId = order?.order_id || shipment.order_id
    
    setUpdating(true)
    setSendStatus('sending')
    
    try {
      // Call backend which calls B2BWave API with notify=true
      const url = `${API_URL}/orders/${orderId}/send-tracking?tracking_number=${encodeURIComponent(trackingNumber)}&shipment_id=${shipment.shipment_id}`
      
      const response = await fetch(url, { method: 'POST' })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Failed to send tracking')
      }
      
      setSendStatus('success')
      
      // Also update local shipment status
      await fetch(`${API_URL}/shipments/${shipment.shipment_id}?status=shipped`, {
        method: 'PATCH'
      })
      
      if (onUpdate) onUpdate()
      
      // Hide input after success
      setTimeout(() => {
        setShowTrackingInput(false)
        setSendStatus(null)
      }, 2000)
      
    } catch (err) {
      console.error('Failed to send tracking:', err)
      setSendStatus('error')
      alert('Failed to send tracking: ' + err.message)
    }
    
    setUpdating(false)
  }
  
  // Save tracking without sending email (just update database)
  const handleSaveOnly = async () => {
    if (!trackingNumber.trim()) return
    
    setUpdating(true)
    try {
      await fetch(`${API_URL}/shipments/${shipment.shipment_id}?tracking_number=${encodeURIComponent(trackingNumber)}`, {
        method: 'PATCH'
      })
      
      await fetch(`${API_URL}/shipments/${shipment.shipment_id}?status=shipped`, {
        method: 'PATCH'
      })
      
      if (onUpdate) onUpdate()
      setShowTrackingInput(false)
    } catch (err) {
      console.error('Failed to save tracking:', err)
      alert('Failed to save tracking')
    }
    setUpdating(false)
  }
  
  // Get shipping cost to display
  const getShippingCost = () => {
    const cost = 
      Number(shipment.rl_customer_price) ||
      Number(shipment.li_customer_price) ||
      Number(shipment.ps_quote_price) ||
      Number(shipment.customer_price) ||
      0
    
    return cost > 0 ? `$${cost.toFixed(2)}` : ''
  }
  
  const shippingCost = getShippingCost()
  
  // Check if shipment has any quote/price info
  const hasQuoteInfo = shipment.rl_quote_number || shipment.rl_quote_price || 
                       shipment.li_quote_price || shipment.quote_price ||
                       shipment.rl_customer_price || shipment.li_customer_price

  // Should show track button? YES for all methods except Pickup and LiDelivery
  const showTrackButton = shipment.ship_method !== 'Pickup' && shipment.ship_method !== 'LiDelivery'
  
  return (
    <div className={`shipment-row ${updating ? 'updating' : ''}`}>
      <div className="shipment-warehouse">
        <strong>{shipment.warehouse}</strong>
        {shippingCost && (
          <span style={{ color: '#2e7d32', marginLeft: '8px' }}>
            — {shippingCost}
          </span>
        )}
        {shipment.weight && <span className="weight"> ({shipment.weight} lbs)</span>}
      </div>
      
      <div className="shipment-controls">
        {/* Status dropdown - uses backend values */}
        <select 
          value={shipment.status || 'needs_order'}
          onChange={handleStatusChange}
          className="status-select"
          style={{ minWidth: '110px' }}
        >
          {STATUS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        
        {/* Method dropdown */}
        <select 
          value={shipment.ship_method || ''}
          onChange={handleMethodChange}
          className="method-select"
          style={{ minWidth: '100px' }}
        >
          {METHOD_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        
        {/* Shipping button - always show */}
        <button 
          className={`btn btn-sm ${hasQuoteInfo ? 'btn-quoted' : 'btn-quote'}`}
          onClick={() => onOpenShippingManager(shipment)}
          style={hasQuoteInfo ? { backgroundColor: '#4caf50', color: '#fff' } : {}}
        >
          Shipping
        </button>
        
        {/* Tracking input/display - show for all except Pickup/LiDelivery */}
        {showTrackButton && (
          <>
            {shipment.tracking_number ? (
              <button 
                className="btn btn-sm btn-tracking"
                onClick={() => setShowTrackingInput(true)}
                title={shipment.tracking_number}
                style={{ backgroundColor: '#2196f3', color: '#fff' }}
              >
                📦 {shipment.tracking_number.slice(-6)}
              </button>
            ) : (
              <button 
                className="btn btn-sm btn-track-entry"
                onClick={() => setShowTrackingInput(true)}
              >
                + Track
              </button>
            )}
          </>
        )}
      </div>
      
      {/* Tracking input row */}
      {showTrackingInput && (
        <div className="tracking-input-row" style={{ 
          marginTop: '8px', 
          display: 'flex', 
          gap: '8px', 
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <input 
            type="text"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder="Enter tracking/PRO number..."
            autoFocus
            style={{ flex: 1, padding: '6px', minWidth: '200px' }}
          />
          
          {/* Save & Email button - sends via B2BWave */}
          <button 
            className="btn btn-sm" 
            onClick={handleSaveAndSendTracking}
            disabled={updating || sendStatus === 'sending'}
            style={{ 
              backgroundColor: sendStatus === 'success' ? '#4caf50' : '#1976d2', 
              color: '#fff',
              minWidth: '120px'
            }}
          >
            {sendStatus === 'sending' ? '📧 Sending...' : 
             sendStatus === 'success' ? '✓ Sent!' : 
             '📧 Save & Email'}
          </button>
          
          {/* Save Only button */}
          <button 
            className="btn btn-sm" 
            onClick={handleSaveOnly}
            disabled={updating}
            style={{ backgroundColor: '#757575', color: '#fff' }}
            title="Save tracking without emailing customer"
          >
            Save Only
          </button>
          
          {/* Cancel */}
          <button 
            className="btn btn-sm" 
            onClick={() => {
              setShowTrackingInput(false)
              setSendStatus(null)
            }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}

export default ShipmentRow
