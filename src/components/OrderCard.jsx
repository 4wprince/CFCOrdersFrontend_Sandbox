/**
 * OrderCard.jsx
 * Minimal restore: renders an order card and allows status updates.
 */

import { useState } from 'react'
import { API_URL } from '../config'

const STATUS_MAP = {
  needs_payment_link: { label: '1-Need Invoice', color: '#f44336' },
  awaiting_payment: { label: '2-Awaiting Pay', color: '#ff9800' },
  needs_warehouse_order: { label: '3-Need to Order', color: '#9c27b0' },
  awaiting_warehouse: { label: '4-At Warehouse', color: '#2196f3' },
  needs_bol: { label: '5-Need BOL', color: '#00bcd4' },
  awaiting_shipment: { label: '6-Ready Ship', color: '#4caf50' },
  complete: { label: 'Complete', color: '#9e9e9e' }
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

const OrderCard = ({ order, onOpenDetail, onOpenShippingManager, onUpdate }) => {
  const [isUpdating, setIsUpdating] = useState(false)

  const status = STATUS_MAP[order?.current_status] || STATUS_MAP.needs_payment_link

  const orderDate = order?.order_date
    ? new Date(order.order_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : ''

  const customerName = order?.company_name || order?.customer_name || 'Unknown'
  const location = order?.city && order?.state ? `${order.city}, ${order.state}` : ''

  const handleStatusChange = async (e) => {
    e.stopPropagation()
    const newStatus = e.target.value
    if (newStatus === order.current_status) return

    setIsUpdating(true)
    try {
      const statusFieldMap = {
        needs_payment_link: { payment_link_sent: false, payment_received: false },
        awaiting_payment: { payment_link_sent: true, payment_received: false },
        needs_warehouse_order: { payment_received: true, sent_to_warehouse: false },
        awaiting_warehouse: { sent_to_warehouse: true, warehouse_confirmed: false },
        needs_bol: { warehouse_confirmed: true, bol_sent: false },
        awaiting_shipment: { bol_sent: true, is_complete: false },
        complete: { is_complete: true }
      }

      const updates = statusFieldMap[newStatus]
      if (!updates) throw new Error(`Unknown status: ${newStatus}`)

      const res = await fetch(`${API_URL}/orders/${order.order_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (!res.ok) {
        const msg = await res.text()
        throw new Error(`PATCH failed ${res.status}: ${msg}`)
      }

      if (onUpdate) onUpdate()
    } catch (err) {
      console.error('Status update failed:', err)
      alert('Status update failed. Check console.')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="order-card" style={{ borderLeftColor: status.color }}>
      <div className="order-header">
        <div className="order-id" onClick={() => onOpenDetail && onOpenDetail(order)}>
          #{order?.order_id}
        </div>

        {orderDate && <div className="order-date">{orderDate}</div>}

        <select
          className="status-dropdown"
          value={order?.current_status || 'needs_payment_link'}
          onChange={handleStatusChange}
          onClick={(e) => e.stopPropagation()}
          disabled={isUpdating}
          style={{
            backgroundColor: status.color + '20',
            color: status.color,
            borderColor: status.color
          }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <span className="order-age-pill">{getAgeLabel(order?.order_date)}</span>
      </div>

      <div className="order-body" onClick={() => onOpenDetail && onOpenDetail(order)}>
        <div className="customer-info">
          <div className="customer-name">{customerName}</div>
          {location && <div className="customer-location">{location}</div>}
        </div>

        <div className="order-actions" style={{ marginLeft: 'auto' }}>
          <button
            className="btn"
            onClick={(e) => {
              e.stopPropagation()
              if (onOpenShippingManager) onOpenShippingManager(order)
            }}
          >
            Shipping
          </button>
        </div>
      </div>
    </div>
  )
}

export default OrderCard
