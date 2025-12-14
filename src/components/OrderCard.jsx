/**
 * OrderCard.jsx
 * Display a single order with status, customer info, shipments, and shipping cost tally
 * v5.8.7 - Black oval days badge showing Today/1 Day/2 Days
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

const getAgeLabel = (orderDate) => {
  if (!orderDate) return ''

  const created = new Date(orderDate)
  const today = new Date()

  // Normalize to midnight to avoid off-by-one issues
  created.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)

  const diffDays = Math.floor(
    (today - created) / (1000 * 60 * 60 * 24)
  )

  if (diffDays <= 0) return 'Today'
  if (diffDays === 1) return '1 Day'
  return `${diffDays} Days`
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

const OrderCard = ({
  order,
  onOpenDetail,
  onOpenShippingManager,
  onUpdate
}) => {
  const [isUpdating, setIsUpdating] = useState(false)
  const status = STATUS_MAP[order.current_status] || STATUS_MAP['needs_payment_link']

  // Get customer display info
  const customerName = order.company_name || order.customer_name || 'Unknown'
  const location = order.city && order.state ? `${order.city}, ${order.state}` : ''

  // Format order date
  const orderDate = order.order_date
    ? new Date(order.order_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : ''

  // Get warehouses from order
  const warehouses = [
    order.warehouse_1,
    order.warehouse_2,
    order.warehouse_3,
    order.warehouse_4
  ].filter(Boolean)

  // Format order total
  const orderTotal = parseFloat(order.order_total || 0)
  const totalDisplay = orderTotal > 0
    ? `$${orderTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    : ''

  // Handle status change
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

    const updates = statusFieldMap[newStatus] || {}

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
    console.error('Failed to update status:', err)
    alert('Status update failed. Open console for details.')
  } finally {
    setIsUpdating(false)
  }
}

  // Calculate shipping totals from shipments
  const calculateShippingTotals = () => {
    if (!order.shipments || order.shipments.length === 0) return null

    let quotedTotal = 0
    let customerChargeTotal = 0
    let actualCostTotal = 0
    let allQuoted = true

    order.shipments.forEach(s => {
      // Customer charge (what we charge)
      if (s.rl_customer_price) {
        customerChargeTotal += parseFloat(s.rl_customer_price)
      } else if (s.li_customer_price) {
        customerChargeTotal += parseFloat(s.li_customer_price)
      } else if (s.customer_price) {
        customerChargeTotal += parseFloat(s.customer_price)
      } else if (s.ps_quote_price) {
        customerChargeTotal += parseFloat(s.ps_quote_price)
      } else if (s.ship_method === 'Pickup') {
        // No charge for pickup
      } else {
        allQuoted = false
      }

      // Our cost (what we pay)
      if (s.rl_quote_price) {
        quotedTotal += parseFloat(s.rl_quote_price)
      } else if (s.li_quote_price) {
        quotedTotal += parseFloat(s.li_quote_price)
      } else if (s.quote_price) {
        quotedTotal += parseFloat(s.quote_price)
      } else if (s.ps_quote_price) {
        quotedTotal += parseFloat(s.ps_quote_price)
      }
    })

    return {
      quoted: quotedTotal,
      customerCharge: customerChargeTotal,
      actualCost: actualCostTotal,
      profit: customerChargeTotal - quotedTotal,
      actualProfit: actualCostTotal > 0 ? customerChargeTotal - actualCostTotal : null,
      allQuoted
    }
  }

  const shippingTotals = calculateShippingTotals()

  // Style for the black oval badge
  const badgeStyle = {
    backgroundColor: '#000',
    color: '#fff',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '500',
    whiteSpace: 'nowrap',
    marginLeft: 'auto'
  }

return (
  <div className="order-card" style={{ borderLeftColor: status.color }}>
    <div className="order-header">
  <div className="order-id" onClick={() => onOpenDetail(order)}>#{order.order_id}</div>
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

    <div className="order-body" onClick={() => onOpenDetail(order)}>
      <div className="customer-info">
        <div className="customer-name">{customerName}</div>
        {location && <div className="customer-location">{location}</div>}
      </div>

      <div className="order-financials">
        {totalDisplay && <div className="order-total">Order: {totalDisplay}</div>}

        {/* Shipping cost summary */}
        {shippingTotals && shippingTotals.customerCharge > 0 && (
          <div className="shipping-summary">
            <span className="ship-charge">Ship: ${shippingTotals.customerCharge.toFixed(2)}</span>
            {shippingTotals.profit !== 0 && (
              <span className={`ship-profit ${shippingTotals.profit >= 0 ? 'positive' : 'negative'}`}>
                ({shippingTotals.profit >= 0 ? '+' : ''}${shippingTotals.profit.toFixed(2)})
              </span>
            )}
          </div>
        )}

        {/* Grand total */}
        {totalDisplay && shippingTotals && shippingTotals.customerCharge > 0 && (
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

      {/* Shipments section */}
      {order.shipments && order.shipments.length > 0 && (
        <div className="order-shipments">
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

      {/* Quick actions */}
      <div className="order-actions">
        <button
          className="btn btn-sm"
          onClick={(e) => {
            e.stopPropagation()
            onOpenDetail(order)
          }}
        >
          Details
        </button>
      </div>
    </div>
  )
}

export default OrderCard
