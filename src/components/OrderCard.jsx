/**
 * OrderCard.jsx
 * Display a single order with status, customer info, shipments, notes, and AI summary
 * v5.9.1 - Styled containers, fixed status updates with boolean fields, blue Add Note button
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

// Maps status value to the boolean fields that backend expects
const STATUS_FIELD_MAP = {
  'needs_payment_link': { payment_link_sent: false, payment_received: false, sent_to_warehouse: false, warehouse_confirmed: false, bol_sent: false, is_complete: false },
  'awaiting_payment': { payment_link_sent: true, payment_received: false, sent_to_warehouse: false, warehouse_confirmed: false, bol_sent: false, is_complete: false },
  'needs_warehouse_order': { payment_link_sent: true, payment_received: true, sent_to_warehouse: false, warehouse_confirmed: false, bol_sent: false, is_complete: false },
  'awaiting_warehouse': { payment_link_sent: true, payment_received: true, sent_to_warehouse: true, warehouse_confirmed: false, bol_sent: false, is_complete: false },
  'needs_bol': { payment_link_sent: true, payment_received: true, sent_to_warehouse: true, warehouse_confirmed: true, bol_sent: false, is_complete: false },
  'awaiting_shipment': { payment_link_sent: true, payment_received: true, sent_to_warehouse: true, warehouse_confirmed: true, bol_sent: true, is_complete: false },
  'complete': { payment_link_sent: true, payment_received: true, sent_to_warehouse: true, warehouse_confirmed: true, bol_sent: true, is_complete: true }
}

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

// Calculate shipping totals
const calculateShippingTotals = (shipments) => {
  if (!shipments || shipments.length === 0) return { customerCharge: 0, cost: 0, profit: 0 }
  
  let customerCharge = 0
  let cost = 0
  
  shipments.forEach(s => {
    const custPrice = 
      Number(s.rl_customer_price) || 
      Number(s.li_customer_price) || 
      Number(s.customer_price) ||
      Number(s.ps_quote_price) ||
      0
    
    const ourCost = 
      Number(s.rl_quote_price) || 
      Number(s.li_quote_price) || 
      Number(s.quote_price) ||
      Number(s.ps_quote_price) ||
      0
    
    customerCharge += custPrice
    cost += ourCost
  })
  
  return { customerCharge, cost, profit: customerCharge - cost }
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

  // Handle status change - sends boolean fields that backend expects
  const handleStatusChange = async (e) => {
    e.stopPropagation()
    const newStatus = e.target.value
    if (newStatus === order.current_status) return

    setIsUpdating(true)
    try {
      const updates = STATUS_FIELD_MAP[newStatus]
      if (!updates) {
        throw new Error('Unknown status')
      }

      const res = await fetch(`${API_URL}/orders/${order.order_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (!res.ok) {
        const errorText = await res.text()
        console.error('Status update failed:', res.status, errorText)
        throw new Error(errorText)
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

  // Container styles
  const containerBase = {
    borderRadius: '8px',
    padding: '8px 10px',
    margin: '6px 8px',
    fontSize: '13px',
    lineHeight: '1.4'
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

      {/* Notes & AI Summary Section */}
      <div className="order-notes-section">
        
        {/* Customer Comments - Yellow container */}
        {order.comments && (
          <div style={{
            ...containerBase,
            backgroundColor: '#fffde7',
            border: '1px solid #f9a825'
          }}>
            <strong>Customer:</strong> {order.comments}
          </div>
        )}

        {/* Internal Notes - Purple container */}
        <div style={{
          ...containerBase,
          backgroundColor: '#f3e5f5',
          border: '1px solid #9c27b0'
        }}>
          {isEditingNotes ? (
            <div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add internal notes..."
                rows={3}
                onClick={(e) => e.stopPropagation()}
                style={{ 
                  width: '100%', 
                  marginBottom: '8px', 
                  padding: '6px', 
                  borderRadius: '4px', 
                  border: '1px solid #9c27b0',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleSaveNotes(); }}
                  disabled={isSavingNotes}
                  style={{ 
                    backgroundColor: '#4caf50', 
                    color: 'white', 
                    border: 'none', 
                    padding: '4px 12px', 
                    borderRadius: '4px', 
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  {isSavingNotes ? 'Saving...' : 'Save'}
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsEditingNotes(false); setNotes(order.notes || ''); }}
                  disabled={isSavingNotes}
                  style={{ 
                    backgroundColor: '#9e9e9e', 
                    color: 'white', 
                    border: 'none', 
                    padding: '4px 12px', 
                    borderRadius: '4px', 
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div onClick={(e) => e.stopPropagation()}>
              {order.notes ? (
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                  <div><strong>Notes:</strong> {order.notes}</div>
                  <button 
                    onClick={() => setIsEditingNotes(true)}
                    style={{ 
                      backgroundColor: '#2196f3', 
                      color: 'white', 
                      border: 'none', 
                      padding: '2px 8px', 
                      borderRadius: '4px', 
                      cursor: 'pointer',
                      fontSize: '11px',
                      flexShrink: 0
                    }}
                  >
                    Edit
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsEditingNotes(true)}
                  style={{ 
                    backgroundColor: '#2196f3', 
                    color: 'white', 
                    border: 'none', 
                    padding: '4px 12px', 
                    borderRadius: '4px', 
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  + Add Note
                </button>
              )}
            </div>
          )}
        </div>

        {/* AI Summary - Green container */}
        {order.ai_summary && (
          <div style={{
            ...containerBase,
            backgroundColor: '#e8f5e9',
            border: '1px solid #4caf50'
          }}>
            <strong>AI Summary:</strong>
            <div style={{ 
              marginTop: '4px',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
              lineHeight: '1.4'
            }}>
              {order.ai_summary}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default OrderCard
