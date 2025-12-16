/**
 * OrderCard.jsx
 * Display a single order with status, customer info, shipments
 * v5.10.0 - Added: colored warehouse status pills
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

// Shipment status colors for warehouse pills
const SHIPMENT_STATUS_COLORS = {
  'needs_order': '#f44336',      // Red
  'at_warehouse': '#9c27b0',     // Purple
  'needs_bol': '#00bcd4',        // Cyan
  'ready_ship': '#4caf50',       // Green
  'shipped': '#607d8b',          // Blue-gray
  'delivered': '#9e9e9e'         // Gray
}

const SHIPMENT_STATUS_LABELS = {
  'needs_order': 'Need to Order',
  'at_warehouse': 'At Warehouse',
  'needs_bol': 'Need BOL',
  'ready_ship': 'Ready to Ship',
  'shipped': 'Shipped',
  'delivered': 'Delivered'
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
  if (!order) return null
  
  const [isUpdating, setIsUpdating] = useState(false)
  const status = STATUS_MAP[order.current_status] || STATUS_MAP['needs_payment_link']

  // Customer info
  const customerName = order.company_name || order.customer_name || 'Unknown'
  
  // Format address: City, State ZIP on one line
  const cityStateZip = [
    order.city,
    order.state ? `${order.state}${order.zip_code ? ' ' + order.zip_code : ''}` : order.zip_code
  ].filter(Boolean).join(', ')
  
  // Street address (separate line)
  const streetAddress = order.street || ''

  // Format order date
  const orderDate = order.order_date
    ? new Date(order.order_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : ''

  // Get warehouses
  const warehouses = [
    order.warehouse_1,
    order.warehouse_2,
    order.warehouse_3,
    order.warehouse_4
  ].filter(Boolean)

  // Build warehouse status map from shipments
  const warehouseStatusMap = {}
  if (order.shipments && order.shipments.length > 0) {
    order.shipments.forEach(shipment => {
      if (shipment.warehouse) {
        warehouseStatusMap[shipment.warehouse] = shipment.status || 'needs_order'
      }
    })
  }

  // Helper to get status color for a warehouse
  const getWarehouseStatusColor = (warehouseName) => {
    const shipmentStatus = warehouseStatusMap[warehouseName]
    if (shipmentStatus && SHIPMENT_STATUS_COLORS[shipmentStatus]) {
      return SHIPMENT_STATUS_COLORS[shipmentStatus]
    }
    // Default to needs_order (red) if no shipment status found
    return SHIPMENT_STATUS_COLORS['needs_order']
  }

  // Helper to get status label for tooltip
  const getWarehouseStatusLabel = (warehouseName) => {
    const shipmentStatus = warehouseStatusMap[warehouseName]
    if (shipmentStatus && SHIPMENT_STATUS_LABELS[shipmentStatus]) {
      return SHIPMENT_STATUS_LABELS[shipmentStatus]
    }
    return 'Need to Order'
  }

  // Format order total
  const orderTotal = parseFloat(order.order_total || 0)
  const totalDisplay = orderTotal > 0
    ? `$${orderTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    : ''

  // Calculate shipping totals
  const shippingTotals = (order.shipments || []).reduce(
    (acc, shipment) => {
      const customerCharge =
        Number(shipment.rl_customer_price) ||
        Number(shipment.li_customer_price) ||
        Number(shipment.customer_price) ||
        Number(shipment.ps_quote_price) ||
        0

      const cost =
        Number(shipment.rl_quote_price) ||
        Number(shipment.li_quote_price) ||
        Number(shipment.quote_price) ||
        Number(shipment.ps_quote_price) ||
        0

      acc.customerCharge += customerCharge
      acc.profit += customerCharge - cost
      return acc
    },
    { customerCharge: 0, profit: 0 }
  )

  // Handle status change - use set-status endpoint
  const handleStatusChange = async (e) => {
    e.stopPropagation()
    const newStatus = e.target.value
    if (newStatus === order.current_status) return

    setIsUpdating(true)
    try {
      const res = await fetch(
        `${API_URL}/orders/${order.order_id}/set-status?status=${newStatus}&source=web_ui`,
        { method: 'PATCH' }
      )

      if (!res.ok) {
        const msg = await res.text()
        throw new Error(msg)
      }

      if (onUpdate) onUpdate()
    } catch (err) {
      alert('Status update failed: ' + err.message)
    } finally {
      setIsUpdating(false)
    }
  }

  // Format AI summary - clean up
  const formatAISummary = (summary) => {
    if (!summary) return ''
    return summary.replace(/\n{2,}/g, '\n').trim()
  }

  return (
    <div className="order-card" style={{ borderLeftColor: status.color }}>
      {/* Header */}
      <div className="order-header">
        <div className="order-id" onClick={() => onOpenDetail(order)}>
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
      <div className="order-body" onClick={() => onOpenDetail(order)}>
        <div className="customer-info">
          <div className="customer-name">{customerName}</div>
          {cityStateZip && <div className="customer-location">{cityStateZip}</div>}
          {streetAddress && (
            <div className="customer-street" style={{ fontSize: '12px', color: '#666' }}>
              {streetAddress}
            </div>
          )}
        </div>

        <div className="order-financials">
          {totalDisplay && <div className="order-total">Order: {totalDisplay}</div>}

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

          {totalDisplay && shippingTotals && shippingTotals.customerCharge > 0 && (
            <div className="grand-total">
              Total: ${(orderTotal + shippingTotals.customerCharge).toFixed(2)}
            </div>
          )}
        </div>

        {/* Warehouse pills with status colors */}
        {warehouses.length > 0 && (
          <div className="warehouses">
            {warehouses.map((wh, i) => {
              const statusColor = getWarehouseStatusColor(wh)
              const statusLabel = getWarehouseStatusLabel(wh)
              return (
                <span 
                  key={i} 
                  className="warehouse-tag"
                  title={statusLabel}
                  style={{
                    backgroundColor: statusColor + '20',
                    color: statusColor,
                    border: `1px solid ${statusColor}`,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '500',
                    marginRight: '4px',
                    display: 'inline-block'
                  }}
                >
                  {wh}
                </span>
              )
            })}
          </div>
        )}
      </div>

      {/* Shipments */}
      {order.shipments && order.shipments.length > 0 && (
        <div className="order-shipments">
          {(order.shipments || []).map((shipment, i) =>
            <ShipmentRow
              key={shipment.shipment_id || i}
              shipment={shipment}
              order={order}
              onOpenShippingManager={onOpenShippingManager}
              onUpdate={onUpdate}
            />
          )}
        </div>
      )}

      {/* Comments - styled box */}
      {order.comments && (
        <div style={{ 
          backgroundColor: '#fff3e0', 
          padding: '8px 12px', 
          borderRadius: '4px',
          marginTop: '8px',
          borderLeft: '3px solid #ff9800'
        }}>
          <strong style={{ color: '#e65100' }}>Customer: </strong>
          <span>{order.comments}</span>
        </div>
      )}

      {/* Notes - styled box */}
      {order.notes && (
        <div style={{ 
          backgroundColor: '#e3f2fd', 
          padding: '8px 12px', 
          borderRadius: '4px',
          marginTop: '8px',
          borderLeft: '3px solid #2196f3'
        }}>
          <strong style={{ color: '#1565c0' }}>Notes: </strong>
          <span>{order.notes}</span>
        </div>
      )}

      {/* AI Summary */}
      {order.ai_summary && (
        <div style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '8px 12px', 
          borderRadius: '4px',
          marginTop: '8px',
          borderLeft: '3px solid #667eea',
          fontSize: '13px'
        }}>
          <strong style={{ color: '#667eea' }}>AI Summary:</strong>
          <div style={{ whiteSpace: 'pre-line', marginTop: '4px' }}>
            {formatAISummary(order.ai_summary)}
          </div>
        </div>
      )}
    </div>
  )
}

export default OrderCard
