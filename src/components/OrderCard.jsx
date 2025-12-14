/**
 * OrderCard.jsx
 * Display a single order with status, customer info, shipments, notes, and AI summary
 * v5.9.0 - Notes/AI Summary inline, fixed status updates
 */

import { useState } from 'react'
import ShipmentRow from './ShipmentRow'
import { API_URL } from '../config'

const STATUS_MAP = {
  'needs_payment_link': { label: '1-Need Invoice', color: '#f44336' },
  'awaiting_payment': { label: '2-Awaiting Pay', color: '#ff9800' },
  'needs_warehouse_order': { label: '3-Need to Order', color: '#9c27b0' },
  'awaiting_warehouse': { label: '4-At Warehouse', color: '#2196f3' },
  'needs_bol': { label: '5-Need BOL', color: '#00bcd4' },
  'awaiting_shipment': { label: '6-Ready Ship', color: '#4caf50' },
  'complete': { label: 'Complete', color: '#9e9e9e' }
}

const STATUS_OPTIONS = [
  { value: 'needs_payment_link', label: '1-Need Invoice' },
  { value: 'awaiting_payment', label: '2-Awaiting Pay' },
  { value: 'needs_warehouse_order', label: '3-Need to Order' },
  { value: 'awaiting_warehouse', label: '4-At Warehouse' },
  { value: 'needs_bol', label: '5-Need BOL' },
  { value: 'awaiting_shipment', label: '6-Ready Ship' },
  { value: 'complete', label: 'Complete' }
]

const getAgeLabel = (orderDate) => {
  if (!orderDate) return ''
  const created = new Date(orderDate)
  const today = new Date()
  created.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  const diffDays = Math.floor((today - created) / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) return 'Today'
  if (diffDays === 1) return '1 Day'
  return `${diffDays} Days`
}

// Calculate shipping totals - includes all pricing fields
const calculateShippingTotals = (shipments) => {
  if (!shipments || shipments.length === 0) return { customerCharge: 0, cost: 0, profit: 0 }
  
  let customerCharge = 0
  let cost = 0
  
  shipments.forEach(s => {
    // Customer charge (what we charge them)
    const custPrice = 
      Number(s.rl_customer_price) || 
      Number(s.li_customer_price) || 
      Number(s.customer_price) ||
      Number(s.ps_quote_price) ||  // Pirateship - use quote as customer price if no markup
      0
    
    // Our cost (what we pay)
    const ourCost = 
      Number(s.rl_quote_price) || 
      Number(s.li_quote_price) || 
      Number(s.quote_price) ||
      Number(s.ps_quote_price) ||  // Pirateship cost
      0
    
    customerCharge += custPrice
    cost += ourCost
  })
  
  return {
    customerCharge,
    cost,
    profit: customerCharge - cost
  }
}

const OrderCard = ({ order, onOpenDetail, onOpenShippingManager, onUpdate }) => {
  const [isUpdating, setIsUpdating] = useState(false)
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [notes, setNotes] = useState(order?.notes || '')
  const [isSavingNotes, setIsSavingNotes] = useState(false)

  if (!order) return null

  const status = STATUS_MAP[order.current_status] || STATUS_MAP['needs_payment_link']
  const customerName = order.company_name || order.customer_name || 'Unknown'
  const location = order.city && order.state ? `${order.city}, ${order.state}` : ''
  const orderDate = order.order_date
    ? new Date(order.order_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : ''

  const warehouses = [
    order.warehouse_1,
    order.warehouse_2,
    order.warehouse_3,
    order.warehouse_4
  ].filter(Boolean)

  const orderTotal = parseFloat(order.order_total || 0)
  const totalDisplay = orderTotal > 0
    ? `$${orderTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    : ''

  const shippingTotals = calculateShippingTotals(order.shipments)

  // Handle status change - sends current_status directly
  const handleStatusChange = async (e) => {
    e.stopPropagation()
    const newStatus = e.target.value
    if (newStatus === order.current_status) return

    setIsUpdating(true)
    try {
      const res = await fetch(`${API_URL}/orders/${order.order_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_status: newStatus })
      })

      if (!res.ok) {
        const errorText = await res.text()
        console.error('Status update failed:', res.status, errorText)
        throw new Error(`Status update failed: ${errorText}`)
      }

      if (onUpdate) onUpdate()
    } catch (err) {
      console.error('Status update error:', err)
      alert('Status update failed: ' + err.message)
    } finally {
      setIsUpdating(false)
    }
  }

  // Handle notes save
  const handleSaveNotes = async () => {
    setIsSavingNotes(true)
    try {
      const res = await fetch(`${API_URL}/orders/${order.order_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      })

      if (!res.ok) throw new Error('Failed to save notes')

      // Regenerate AI summary after notes change
      await fetch(`${API_URL}/orders/${order.order_id}/generate-summary?force=true`, {
        method: 'POST'
      })

      setIsEditingNotes(false)
      if (onUpdate) onUpdate()
    } catch (err) {
      console.error('Failed to save notes:', err)
      alert('Failed to save notes')
    } finally {
      setIsSavingNotes(false)
    }
  }

  return (
    <div className="order-card" style={{ borderLeftColor: status.color }}>
      {/* Header */}
      <div className="order-header">
        <div className="order-id" onClick={() => onOpenDetail && onOpenDetail(order)}>
          #{order.order_id}
        </div>
        {orderDate && <div className="order-date">{orderDate}</div>}

        <div className="order-header-right">
          <select
            className="status-dropdown"
            value={order.current_status || 'needs_payment_link'}
            onChange={handleStatusChange}
            onClick={(e) => e.stopPropagation()}
            disabled={isUpdating}
            style={{
              backgroundColor: status.color + '20',
              color: status.color,
              borderColor: status.color
            }}
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <span className="order-age-pill">
            {getAgeLabel(order.order_date)}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="order-body" onClick={() => onOpenDetail && onOpenDetail(order)}>
        <div className="customer-info">
          <div className="customer-name">{customerName}</div>
          {location && <div className="customer-location">{location}</div>}
        </div>

        <div className="order-financials">
          {totalDisplay && <div className="order-total">Order: {totalDisplay}</div>}

          {shippingTotals.customerCharge > 0 && (
            <div className="shipping-summary">
              <span className="ship-charge">Ship: ${shippingTotals.customerCharge.toFixed(2)}</span>
              {shippingTotals.profit !== 0 && (
                <span className={`ship-profit ${shippingTotals.profit >= 0 ? 'positive' : 'negative'}`}>
                  ({shippingTotals.profit >= 0 ? '+' : ''}${shippingTotals.profit.toFixed(2)})
                </span>
              )}
            </div>
          )}

          {totalDisplay && shippingTotals.customerCharge > 0 && (
            <div className="grand-total">
              Total: ${(orderTotal + shippingTotals.customerCharge).toFixed(2)}
            </div>
          )}
        </div>

        {warehouses.length > 0 && (
          <div className="warehouses">
            {warehouses.map((wh, i) => (
              <span key={i} className="warehouse-tag">{wh}</span>
            ))}
          </div>
        )}
      </div>

      {/* Shipments */}
      {order.shipments && order.shipments.length > 0 && (
        <div className="order-shipments">
          {(order.shipments || []).map((shipment, i) => (
            <ShipmentRow
              key={shipment.shipment_id || i}
              shipment={shipment}
              order={order}
              onOpenShippingManager={onOpenShippingManager}
              onUpdate={onUpdate}
            />
          ))}
        </div>
      )}

      {/* Notes & AI Summary Section (replaces Details button) */}
      <div className="order-notes-section">
        {/* Customer Comments */}
        {order.comments && (
          <div className="customer-comments">
            <strong>Customer:</strong> {order.comments}
          </div>
        )}

        {/* Internal Notes */}
        <div className="internal-notes">
          {isEditingNotes ? (
            <div className="notes-editor">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add internal notes..."
                rows={3}
                onClick={(e) => e.stopPropagation()}
              />
              <div className="notes-actions">
                <button 
                  className="btn btn-sm btn-success" 
                  onClick={(e) => { e.stopPropagation(); handleSaveNotes(); }}
                  disabled={isSavingNotes}
                >
                  {isSavingNotes ? 'Saving...' : 'Save'}
                </button>
                <button 
                  className="btn btn-sm" 
                  onClick={(e) => { e.stopPropagation(); setIsEditingNotes(false); setNotes(order.notes || ''); }}
                  disabled={isSavingNotes}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="notes-display" onClick={(e) => e.stopPropagation()}>
              {order.notes ? (
                <div className="notes-text">
                  <strong>Notes:</strong> {order.notes}
                  <button 
                    className="btn btn-xs" 
                    onClick={() => setIsEditingNotes(true)}
                  >
                    Edit
                  </button>
                </div>
              ) : (
                <button 
                  className="btn btn-sm btn-secondary" 
                  onClick={() => setIsEditingNotes(true)}
                >
                  + Add Note
                </button>
              )}
            </div>
          )}
        </div>

        {/* AI Summary */}
        {order.ai_summary && (
          <div className="ai-summary">
            <strong>AI Summary:</strong>
            <pre>{order.ai_summary}</pre>
          </div>
        )}
      </div>
    </div>
  )
}

export default OrderCard
