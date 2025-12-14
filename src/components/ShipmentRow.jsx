/**
 * ShipmentRow.jsx
 * v5.9.3 - Correct backend status values, fixed Li_Delivery layout, cost display
 */

import { useState } from 'react'
import { API_URL } from '../config'

// Backend expects these exact status values
const STATUS_OPTIONS = [
  { value: 'needs_order', label: 'Pending' },
  { value: 'at_warehouse', label: 'At Warehouse' },
  { value: 'needs_bol', label: 'Needs BOL' },
  { value: 'ready_ship', label: 'Ready Ship' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' }
]

// Backend expects these exact method values
const METHOD_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'LTL', label: 'LTL' },
  { value: 'Pirateship', label: 'Pirateship' },
  { value: 'Pickup', label: 'Pickup' },
  { value: 'BoxTruck', label: 'BoxTruck' },
  { value: 'LiDelivery', label: 'Li_Delivery' }
]

const getShippingCost = (shipment) => {
  const customerPrice = 
    Number(shipment.rl_customer_price) || Number(shipment.li_customer_price) || 
    Number(shipment.customer_price) || Number(shipment.ps_quote_price) || 0
  if (customerPrice === 0) {
    return Number(shipment.rl_quote_price) || Number(shipment.li_quote_price) || Number(shipment.quote_price) || 0
  }
  return customerPrice
}

// Check if shipment has quote/price info for button styling
const hasQuoteInfo = (shipment) => {
  return shipment.rl_quote_number || shipment.rl_quote_price || 
         shipment.li_quote_price || shipment.quote_price || 
         shipment.ps_quote_price || shipment.customer_price ||
         shipment.rl_customer_price || shipment.li_customer_price
}

const ShipmentRow = ({ shipment, order, onOpenShippingManager, onUpdate }) => {
  const [updating, setUpdating] = useState(false)
  const [showTrackingInput, setShowTrackingInput] = useState(false)
  const [trackingNumber, setTrackingNumber] = useState(shipment.tracking_number || '')
  
  const handleStatusChange = async (newStatus) => {
    setUpdating(true)
    try {
      await fetch(`${API_URL}/shipments/${shipment.shipment_id}?status=${newStatus}`, { method: 'PATCH' })
      if (onUpdate) onUpdate()
    } catch (err) { console.error('Failed to update status:', err) }
    setUpdating(false)
  }
  
  const handleMethodChange = async (newMethod) => {
    setUpdating(true)
    try {
      await fetch(`${API_URL}/shipments/${shipment.shipment_id}?ship_method=${newMethod}`, { method: 'PATCH' })
      if (onUpdate) onUpdate()
      // Open shipping manager for methods that need it
      if (newMethod && newMethod !== 'Pickup') {
        onOpenShippingManager(shipment)
      }
    } catch (err) { console.error('Failed to update method:', err) }
    setUpdating(false)
  }
  
  const handleSaveTracking = async () => {
    if (!trackingNumber.trim()) return
    setUpdating(true)
    try {
      await fetch(`${API_URL}/shipments/${shipment.shipment_id}?tracking_number=${encodeURIComponent(trackingNumber)}`, { method: 'PATCH' })
      await fetch(`${API_URL}/shipments/${shipment.shipment_id}?status=shipped`, { method: 'PATCH' })
      if (onUpdate) onUpdate()
      setShowTrackingInput(false)
      sendTrackingEmail()
    } catch (err) { console.error('Failed to save tracking:', err) }
    setUpdating(false)
  }
  
  const sendTrackingEmail = () => {
    const customerEmail = order.email || ''
    const subject = `Your CFC Order #${order.order_id} Has Shipped!`
    const body = `Hello,\n\nYour order #${order.order_id} has been shipped.\n\nTracking: ${trackingNumber}\n\nThank you for your business!\nCabinets For Contractors`
    window.open(`mailto:${customerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank')
  }
  
  const shippingCost = getShippingCost(shipment)
  const quoted = hasQuoteInfo(shipment)
  const currentStatus = shipment.status || 'needs_order'
  const showTracking = shipment.ship_method && shipment.ship_method !== 'Pickup' && shipment.ship_method !== 'LiDelivery'
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '6px 8px',
      backgroundColor: updating ? '#f5f5f5' : 'white',
      borderBottom: '1px solid #eee',
      gap: '8px',
      opacity: updating ? 0.7 : 1
    }}>
      {/* Warehouse name + cost - fixed width */}
      <div style={{ minWidth: '120px', maxWidth: '140px' }}>
        <strong style={{ fontSize: '13px' }}>{shipment.warehouse}</strong>
        {shippingCost > 0 && (
          <span style={{ marginLeft: '6px', color: '#2e7d32', fontWeight: '600', fontSize: '12px' }}>
            — ${shippingCost.toFixed(2)}
          </span>
        )}
      </div>
      
      {/* Status dropdown - fixed width */}
      <select
        value={currentStatus}
        onChange={(e) => handleStatusChange(e.target.value)}
        disabled={updating}
        style={{
          padding: '4px 6px',
          borderRadius: '4px',
          border: '1px solid #ddd',
          fontSize: '12px',
          width: '100px',
          flexShrink: 0
        }}
      >
        {STATUS_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      
      {/* Method dropdown - fixed width */}
      <select
        value={shipment.ship_method || ''}
        onChange={(e) => handleMethodChange(e.target.value)}
        disabled={updating}
        style={{
          padding: '4px 6px',
          borderRadius: '4px',
          border: '1px solid #ddd',
          fontSize: '12px',
          width: '100px',
          flexShrink: 0
        }}
      >
        {METHOD_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      
      {/* Shipping button */}
      <button
        onClick={() => onOpenShippingManager(shipment)}
        style={{
          backgroundColor: quoted ? '#4caf50' : '#2196f3',
          color: 'white',
          border: 'none',
          padding: '4px 10px',
          borderRadius: '4px',
          fontSize: '12px',
          cursor: 'pointer',
          flexShrink: 0
        }}
      >
        Shipping
      </button>
      
      {/* Track button - only show for methods that need tracking */}
      {showTracking && (
        <>
          {shipment.tracking_number ? (
            <button
              onClick={() => setShowTrackingInput(true)}
              title={shipment.tracking_number}
              style={{
                backgroundColor: '#ff9800',
                color: 'white',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                cursor: 'pointer',
                flexShrink: 0
              }}
            >
              📦 {shipment.tracking_number.slice(-6)}
            </button>
          ) : (
            <button
              onClick={() => setShowTrackingInput(true)}
              style={{
                backgroundColor: 'white',
                color: '#2196f3',
                border: '1px solid #2196f3',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                cursor: 'pointer',
                flexShrink: 0
              }}
            >
              + Track
            </button>
          )}
        </>
      )}
      
      {/* Tracking input modal */}
      {showTrackingInput && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowTrackingInput(false)}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            minWidth: '300px'
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 12px 0' }}>Enter Tracking Number</h3>
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Tracking number..."
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                marginBottom: '12px',
                boxSizing: 'border-box'
              }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowTrackingInput(false)}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTracking}
                disabled={!trackingNumber.trim()}
                style={{
                  padding: '6px 12px',
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: '#4caf50',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Save & Email
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ShipmentRow
