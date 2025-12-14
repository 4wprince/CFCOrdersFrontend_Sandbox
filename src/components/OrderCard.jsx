/**
 * OrderCard.jsx
 * v5.9.3 - Uses correct /set-status endpoint, fixed header layout
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
  return diffDays + ' Days'
}

const calculateShippingTotals = (shipments) => {
  if (!shipments || shipments.length === 0) return { customerCharge: 0, cost: 0, profit: 0 }
  let customerCharge = 0
  let cost = 0
  shipments.forEach(s => {
    const custPrice = Number(s.rl_customer_price) || Number(s.li_customer_price) || Number(s.customer_price) || Number(s.ps_quote_price) || 0
    const ourCost = Number(s.rl_quote_price) || Number(s.li_quote_price) || Number(s.quote_price) || Number(s.ps_quote_price) || 0
    customerCharge += custPrice
    cost += ourCost
  })
  return { customerCharge, cost, profit: customerCharge - cost }
}

// Clean up AI summary - remove double newlines, clean markdown
const formatAISummary = (summary) => {
  if (!summary) return ''
  return summary
    .replace(/\r\n/g, '\n')           // Normalize line endings
    .replace(/\n{2,}/g, '\n')          // Collapse multiple newlines to single
    .replace(/^\s*[\r\n]/gm, '')       // Remove blank lines
    .replace(/\*\*/g, '')              // Remove bold markers
    .trim()
}

const OrderCard = ({ order, onOpenDetail, onOpenShippingManager, onUpdate }) => {
  const [isUpdating, setIsUpdating] = useState(false)
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [notes, setNotes] = useState(order?.notes || '')
  const [isSavingNotes, setIsSavingNotes] = useState(false)

  if (!order) return null

  const status = STATUS_MAP[order.current_status] || STATUS_MAP['needs_payment_link']
  const customerName = order.company_name || order.customer_name || 'Unknown'
  const location = order.city && order.state ? order.city + ', ' + order.state : ''
  const orderDate = order.order_date ? new Date(order.order_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
  const warehouses = [order.warehouse_1, order.warehouse_2, order.warehouse_3, order.warehouse_4].filter(Boolean)
  const orderTotal = parseFloat(order.order_total || 0)
  const totalDisplay = orderTotal > 0 ? '$' + orderTotal.toLocaleString('en-US', { minimumFractionDigits: 2 }) : ''
  const shippingTotals = calculateShippingTotals(order.shipments)

  // Use the correct backend endpoint: /orders/{id}/set-status?status=X
  const handleStatusChange = async (e) => {
    e.stopPropagation()
    const newStatus = e.target.value
    if (newStatus === order.current_status) return

    setIsUpdating(true)
    try {
      const res = await fetch(`${API_URL}/orders/${order.order_id}/set-status?status=${newStatus}&source=web_ui`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!res.ok) {
        const errorText = await res.text()
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

  const handleSaveNotes = async () => {
    setIsSavingNotes(true)
    try {
      const res = await fetch(`${API_URL}/orders/${order.order_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      })
      if (!res.ok) throw new Error('Failed to save notes')
      await fetch(`${API_URL}/orders/${order.order_id}/generate-summary?force=true`, { method: 'POST' })
      setIsEditingNotes(false)
      if (onUpdate) onUpdate()
    } catch (err) {
      alert('Failed to save notes')
    } finally {
      setIsSavingNotes(false)
    }
  }

  const containerBase = { borderRadius: '8px', padding: '8px 10px', margin: '6px 8px', fontSize: '13px', lineHeight: '1.4' }

  return (
    <div className="order-card" style={{ borderLeftColor: status.color }}>
      {/* Header - Fixed layout: 5px | Order# | Date | Dropdown | Days | 5px */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 5px',
        gap: '8px',
        borderBottom: '1px solid #eee'
      }}>
        {/* Order ID - left side */}
        <div 
          onClick={() => onOpenDetail && onOpenDetail(order)}
          style={{ 
            fontWeight: '700',
            fontSize: '14px',
            color: '#1976d2',
            cursor: 'pointer',
            minWidth: '60px'
          }}
        >
          #{order.order_id}
        </div>

        {/* Date */}
        <div style={{ color: '#666', fontSize: '13px', minWidth: '50px' }}>
          {orderDate}
        </div>

        {/* Status Dropdown - center, flex grow */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <select
            value={order.current_status || 'needs_payment_link'}
            onChange={handleStatusChange}
            onClick={(e) => e.stopPropagation()}
            disabled={isUpdating}
            style={{
              backgroundColor: status.color + '20',
              color: status.color,
              borderColor: status.color,
              padding: '4px 8px',
              borderRadius: '12px',
              border: '2px solid',
              fontWeight: '600',
              fontSize: '12px',
              cursor: 'pointer',
              minWidth: '130px'
            }}
          >
            {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>

        {/* Days - right side */}
        <div style={{
          backgroundColor: '#333',
          color: 'white',
          padding: '4px 10px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: '600',
          minWidth: '50px',
          textAlign: 'center'
        }}>
          {getAgeLabel(order.order_date)}
        </div>
      </div>

      {/* Body */}
      <div className="order-body" onClick={() => onOpenDetail && onOpenDetail(order)} style={{ padding: '8px', cursor: 'pointer' }}>
        <div className="customer-info">
          <div style={{ fontWeight: '600', fontSize: '14px' }}>{customerName}</div>
          {location && <div style={{ color: '#666', fontSize: '12px' }}>{location}</div>}
        </div>
        <div className="order-financials" style={{ marginTop: '4px' }}>
          {totalDisplay && <div style={{ fontSize: '13px' }}>Order: {totalDisplay}</div>}
          {shippingTotals.customerCharge > 0 && (
            <div style={{ fontSize: '12px', color: '#666' }}>
              Ship: ${shippingTotals.customerCharge.toFixed(2)}
              {shippingTotals.profit !== 0 && (
                <span style={{ marginLeft: '4px', color: shippingTotals.profit >= 0 ? '#4caf50' : '#f44336' }}>
                  ({shippingTotals.profit >= 0 ? '+' : ''}${shippingTotals.profit.toFixed(2)})
                </span>
              )}
            </div>
          )}
          {totalDisplay && shippingTotals.customerCharge > 0 && (
            <div style={{ fontWeight: '600', fontSize: '13px' }}>Total: ${(orderTotal + shippingTotals.customerCharge).toFixed(2)}</div>
          )}
        </div>
        {warehouses.length > 0 && (
          <div style={{ marginTop: '4px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {warehouses.map((wh, i) => (
              <span key={i} style={{ backgroundColor: '#e3f2fd', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>{wh}</span>
            ))}
          </div>
        )}
      </div>

      {/* Shipments */}
      {order.shipments && order.shipments.length > 0 && (
        <div style={{ borderTop: '1px solid #eee', padding: '4px 0' }}>
          {order.shipments.map((shipment, i) => (
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
      <div style={{ borderTop: '1px solid #eee' }}>
        {/* Customer Comments - Yellow */}
        {order.comments && (
          <div style={{ ...containerBase, backgroundColor: '#fffde7', border: '1px solid #f9a825' }}>
            <strong>Customer:</strong> {order.comments}
          </div>
        )}

        {/* Internal Notes - Purple */}
        <div style={{ ...containerBase, backgroundColor: '#f3e5f5', border: '1px solid #9c27b0' }}>
          {isEditingNotes ? (
            <div onClick={(e) => e.stopPropagation()}>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add internal notes..."
                rows={3}
                style={{ width: '100%', marginBottom: '8px', padding: '6px', borderRadius: '4px', border: '1px solid #9c27b0', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleSaveNotes} disabled={isSavingNotes} style={{ backgroundColor: '#4caf50', color: 'white', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                  {isSavingNotes ? 'Saving...' : 'Save'}
                </button>
                <button onClick={() => { setIsEditingNotes(false); setNotes(order.notes || ''); }} disabled={isSavingNotes} style={{ backgroundColor: '#9e9e9e', color: 'white', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div onClick={(e) => e.stopPropagation()}>
              {order.notes ? (
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                  <div><strong>Notes:</strong> {order.notes}</div>
                  <button onClick={() => setIsEditingNotes(true)} style={{ backgroundColor: '#2196f3', color: 'white', border: 'none', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', flexShrink: 0 }}>Edit</button>
                </div>
              ) : (
                <button onClick={() => setIsEditingNotes(true)} style={{ backgroundColor: '#2196f3', color: 'white', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>+ Add Note</button>
              )}
            </div>
          )}
        </div>

        {/* AI Summary - Green */}
        {order.ai_summary && (
          <div style={{ ...containerBase, backgroundColor: '#e8f5e9', border: '1px solid #4caf50' }}>
            <strong>AI Summary:</strong>
            <div style={{ marginTop: '4px', whiteSpace: 'pre-wrap', lineHeight: '1.5', fontSize: '12px' }}>
              {formatAISummary(order.ai_summary)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default OrderCard
