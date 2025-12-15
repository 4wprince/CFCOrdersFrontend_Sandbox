/**
 * ShipmentRow.jsx
 * Display a single warehouse shipment with status, method, and actions
 * v5.9.1 - Uses helper files, correct backend values, track button fix
 */

import { useState } from 'react'
import { 
  SHIPMENT_STATUS_OPTIONS, 
  SHIP_METHOD_OPTIONS 
} from '../helpers/statusHelpers'
import { 
  updateShipmentStatus, 
  updateShipmentMethod, 
  saveTrackingNumber 
} from '../helpers/syncHelpers'
import { API_URL } from '../config'

const ShipmentRow = ({ 
  shipment, 
  order,
  onOpenShippingManager,
  onUpdate 
}) => {
  const [updating, setUpdating] = useState(false)
  const [showTrackingInput, setShowTrackingInput] = useState(false)
  const [trackingNumber, setTrackingNumber] = useState(shipment.tracking_number || '')
  
  const handleStatusChange = async (e) => {
    const newStatus = e.target.value
    setUpdating(true)
    
    const result = await updateShipmentStatus(API_URL, shipment.shipment_id, newStatus)
    
    if (result.success && onUpdate) {
      onUpdate()
    }
    
    setUpdating(false)
  }
  
  const handleMethodChange = async (e) => {
    const newMethod = e.target.value
    setUpdating(true)
    
    const result = await updateShipmentMethod(API_URL, shipment.shipment_id, newMethod)
    
    if (result.success) {
      if (onUpdate) onUpdate()
      
      // Open shipping manager for methods that need helpers
      if (newMethod && newMethod !== 'Pickup') {
        onOpenShippingManager(shipment)
      }
    }
    
    setUpdating(false)
  }
  
  const handleSaveTracking = async () => {
    if (!trackingNumber.trim()) return
    
    setUpdating(true)
    
    const result = await saveTrackingNumber(API_URL, shipment.shipment_id, trackingNumber)
    
    if (result.success) {
      if (onUpdate) onUpdate()
      setShowTrackingInput(false)
      
      // Open mailto with tracking info
      sendTrackingEmail()
    }
    
    setUpdating(false)
  }
  
  const sendTrackingEmail = () => {
    const customerEmail = order?.email || ''
    const customerName = order?.customer_name || 'Valued Customer'
    const companyName = order?.company_name || customerName
    const orderId = order?.order_id || shipment.order_id
    const firstName = customerName.split(' ')[0]
    
    // Determine carrier and tracking URL
    let carrier = 'Freight'
    let trackingUrl = ''
    
    if (shipment.ship_method === 'LTL') {
      carrier = 'RL Carriers'
      trackingUrl = `https://www.rlcarriers.com/freight/shipping/shipment-tracing?pro=${trackingNumber}`
    } else if (shipment.ship_method === 'Pirateship' || shipment.ship_method === 'BoxTruck') {
      if (trackingNumber.startsWith('1Z')) {
        carrier = 'UPS'
        trackingUrl = `https://www.ups.com/track?tracknum=${trackingNumber}`
      } else if (trackingNumber.length === 22 || trackingNumber.length === 26) {
        carrier = 'USPS'
        trackingUrl = `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`
      }
    }
    
    const subject = `${companyName}, please see tracking information for order ${orderId}`
    
    const body = `Hey ${firstName},

Thank you for your business! Your order ${orderId} has been shipped.

${carrier} Tracking Number: ${trackingNumber}
${trackingUrl ? `Track your shipment: ${trackingUrl}` : ''}

Thank you for your business,
The Cabinets For Contractors Team`
    
    const mailtoUrl = `mailto:${customerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(mailtoUrl, '_blank')
  }
  
  // Get shipping cost to display
  const getShippingCost = () => {
    const cost = 
      Number(shipment.rl_customer_price) ||
      Number(shipment.li_customer_price) ||
      Number(shipment.ps_quote_price) ||
      Number(shipment.customer_price) ||
      Number(shipment.rl_quote_price) ||
      Number(shipment.li_quote_price) ||
      Number(shipment.quote_price) ||
      0
    
    return cost > 0 ? `$${cost.toFixed(2)}` : ''
  }
  
  const shippingCost = getShippingCost()
  
  // Check if shipment has any quote/price info
  const hasQuoteInfo = shipment.rl_quote_number || shipment.rl_quote_price || 
                       shipment.li_quote_price || shipment.quote_price ||
                       shipment.rl_customer_price || shipment.li_customer_price

  // Should show track button? YES for all methods except Pickup and LiDelivery
  // FIX: Show track button even if quote info exists
  const showTrackButton = shipment.ship_method !== 'Pickup' && shipment.ship_method !== 'LiDelivery'
  
  return (
    <div className={`shipment-row ${updating ? 'updating' : ''}`}>
      <div className="shipment-warehouse">
        <strong>{shipment.warehouse}</strong>
        {/* Show cost next to warehouse name */}
        {shippingCost && (
          <span className="shipping-cost" style={{ color: '#2e7d32', marginLeft: '8px' }}>
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
          {SHIPMENT_STATUS_OPTIONS.map(opt => (
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
          {SHIP_METHOD_OPTIONS.map(opt => (
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
        
        {/* Tracking input/display - FIX: Show regardless of quote info */}
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
          alignItems: 'center' 
        }}>
          <input 
            type="text"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder="Enter tracking/PRO number..."
            autoFocus
            style={{ flex: 1, padding: '6px' }}
          />
          <button 
            className="btn btn-sm btn-success" 
            onClick={handleSaveTracking}
            style={{ backgroundColor: '#4caf50', color: '#fff' }}
          >
            Save & Email
          </button>
          <button 
            className="btn btn-sm" 
            onClick={() => setShowTrackingInput(false)}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}

export default ShipmentRow
