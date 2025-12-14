/**
 * ShipmentRow.jsx v5.9.2
 */

import { useState } from 'react'
import { API_URL } from '../config'

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'quoted', label: 'Quoted' },
  { value: 'booked', label: 'Booked' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' }
]

const METHOD_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'LTL', label: 'LTL' },
  { value: 'Pirateship', label: 'Pirateship' },
  { value: 'Pickup', label: 'Pickup' },
  { value: 'BoxTruck', label: 'BoxTruck' },
  { value: 'LiDelivery', label: 'Li Delivery' }
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
      if (newMethod && newMethod !== 'Pickup') onOpenShippingManager(shipment)
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
    const customerEmail = order?.email || ''
    const customerName = order?.customer_name || 'Valued Customer'
    const companyName = order?.company_name || customerName
    const orderId = order?.order_id || shipment.order_id
    const firstName = customerName.split(' ')[0]
    let carrier = 'Freight', trackingUrl = ''
    if (shipment.ship_method === 'LTL') {
      carrier = 'RL Carriers'
      trackingUrl = `https://www.rlcarriers.com/freight/shipping/shipment-tracing?pro=${trackingNumber}`
    } else if (shipment.ship_method === 'Pirateship' || shipment.ship_method === 'BoxTruck') {
      if (trackingNumber.startsWith('1Z')) { carrier = 'UPS'; trackingUrl = `https://www.ups.com/track?tracknum=${trackingNumber}` }
      else if (trackingNumber.length === 22 || trackingNumber.length === 26) { carrier = 'USPS'; trackingUrl = `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}` }
    }
    const subject = `${companyName}, please see tracking information for order ${orderId}`
    const body = `Hey ${firstName},\n\nThank you for your business! Your order ${orderId} has been shipped.\n\n${carrier} Tracking Number: ${trackingNumber}\n${trackingUrl ? `Track your shipment: ${trackingUrl}` : ''}\n\nThank you for your business,\nThe Cabinets For Contractors Team`
    window.open(`mailto:${customerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank')
  }
  
  const hasQuoteInfo = shipment.rl_quote_number || shipment.rl_quote_price || shipment.li_quote_price || 
                       shipment.quote_price || shipment.ps_quote_price || shipment.li_customer_price ||
                       shipment.rl_customer_price || shipment.customer_price
  const shippingCost = getShippingCost(shipment)
  const showTrackingButton = shipment.ship_method !== 'LiDelivery' && shipment.ship_method !== 'Pickup'
  
  return (
    <div className={`shipment-row ${updating ? 'updating' : ''}`}>
      <div className="shipment-warehouse">
        <strong>{shipment.warehouse}</strong>
        {shippingCost > 0 && <span style={{ marginLeft: '8px', color: '#2e7d32', fontWeight: '600', fontSize: '13px' }}>— ${shippingCost.toFixed(2)}</span>}
      </div>
      
      <div className="shipment-controls" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <select value={shipment.status || 'pending'} onChange={(e) => handleStatusChange(e.target.value)} className="status-select" style={{ minWidth: '90px' }}>
          {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        
        <select value={shipment.ship_method || ''} onChange={(e) => handleMethodChange(e.target.value)} className="method-select" style={{ minWidth: '100px' }}>
          {METHOD_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        
        <button className={`btn btn-sm ${hasQuoteInfo ? 'btn-quoted' : 'btn-quote'}`} onClick={() => onOpenShippingManager(shipment)}>Shipping</button>
        
        {showTrackingButton && (
          shipment.tracking_number ? (
            <button className="btn btn-sm btn-tracking" onClick={() => setShowTrackingInput(true)} title={shipment.tracking_number}>📦 {shipment.tracking_number.slice(-6)}</button>
          ) : (
            <button className="btn btn-sm btn-track-entry" onClick={() => setShowTrackingInput(true)}>+ Track</button>
          )
        )}
      </div>
      
      {showTrackingInput && (
        <div className="tracking-input-row">
          <input type="text" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="Enter tracking/PRO number..." autoFocus />
          <button className="btn btn-sm btn-success" onClick={handleSaveTracking}>Save & Email</button>
          <button className="btn btn-sm" onClick={() => setShowTrackingInput(false)}>✕</button>
        </div>
      )}
    </div>
  )
}

export default ShipmentRow
