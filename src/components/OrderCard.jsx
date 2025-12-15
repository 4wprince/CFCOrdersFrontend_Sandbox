/**
 * OrderCard.jsx
 * Display a single order with status, customer info, shipments
 * v5.9.1 - Uses helper files, color-coded dropdown, full address, fixed status endpoint
 */

import { useState } from 'react'
import ShipmentRow from './ShipmentRow'
import { 
  STATUS_MAP, 
  STATUS_OPTIONS, 
  getStatusInfo, 
  getStatusColor,
  getAgeLabel 
} from '../helpers/statusHelpers'
import { 
  getCustomerName, 
  formatStreetAddress, 
  getDisplayLocation 
} from '../helpers/addressHelpers'
import { updateOrderStatus } from '../helpers/syncHelpers'
import { orderHasCriticalFlags, getCriticalBadges } from '../helpers/criticalHelpers'
import { API_URL } from '../config'

const OrderCard = ({ order, onOpenDetail, onOpenShippingManager, onUpdate }) => {
  if (!order) return null
  
  const [isUpdating, setIsUpdating] = useState(false)
  
  const status = getStatusInfo(order.current_status)
  const statusColor = getStatusColor(order.current_status)

  // Get customer display info using helpers
  const customerName = getCustomerName(order)
  const location = getDisplayLocation(order)
  const streetAddress = formatStreetAddress(order)
  
  // Check for critical flags
  const hasCritical = orderHasCriticalFlags(order)
  const criticalBadges = hasCritical ? getCriticalBadges(order.comments + ' ' + order.notes) : []

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

  // Calculate shipping totals safely
  const shippingTotals = (order.shipments || []).reduce(
    (acc, shipment) => {
      const customerCharge =
        Number(shipment.customer_price) ||
        Number(shipment.rl_customer_price) ||
        Number(shipment.li_customer_price) ||
        0

      const cost =
        Number(shipment.quote_price) ||
        Number(shipment.rl_quote_price) ||
        Number(shipment.li_quote_price) ||
        0

      acc.customerCharge += customerCharge
      acc.profit += customerCharge - cost
      return acc
    },
    { customerCharge: 0, profit: 0 }
  )

  // Handle status change - use correct endpoint
  const handleStatusChange = async (e) => {
    e.stopPropagation()
    const newStatus = e.target.value
    if (newStatus === order.current_status) return

    setIsUpdating(true)
    
    const result = await updateOrderStatus(API_URL, order.order_id, newStatus)
    
    if (result.success) {
      if (onUpdate) onUpdate()
    } else {
      alert('Status update failed: ' + result.error)
    }
    
    setIsUpdating(false)
  }

  // Format AI summary - remove double newlines
  const formatAISummary = (summary) => {
    if (!summary) return ''
    return summary.replace(/\n{2,}/g, '\n').trim()
  }

  return (
    <div 
      className={`order-card ${hasCritical ? 'has-critical' : ''}`} 
      style={{ borderLeftColor: statusColor }}
    >
      {/* Header */}
      <div className="order-header">
        <div className="order-id" onClick={() => onOpenDetail(order)}>
          #{order.order_id}
        </div>
        {orderDate && <div className="order-date">{orderDate}</div>}

        <div className="order-header-right">
          {/* Color-coded status dropdown */}
          <select
            className="status-dropdown"
            value={order.current_status || 'needs_payment_link'}
            onChange={handleStatusChange}
            onClick={(e) => e.stopPropagation()}
            disabled={isUpdating}
            style={{
              backgroundColor: statusColor + '20',
              color: statusColor,
              borderColor: statusColor
            }}
          >
            {STATUS_OPTIONS.map(opt => (
              <option 
                key={opt.value} 
                value={opt.value}
                style={{ color: opt.color }}
              >
                {opt.label}
              </option>
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
          {location && <div className="customer-location">{location}</div>}
          {/* Full street address */}
          {streetAddress && (
            <div className="customer-street" style={{ fontSize: '12px', color: '#666' }}>
              {streetAddress}
            </div>
          )}
        </div>

        {/* Critical badges */}
        {hasCritical && criticalBadges.length > 0 && (
          <div className="critical-badges">
            {criticalBadges.map((badge, i) => (
              <span 
                key={i} 
                className="critical-badge"
                style={{
                  backgroundColor: '#d32f2f',
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: '600',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  marginRight: '4px'
                }}
              >
                {badge}
              </span>
            ))}
          </div>
        )}

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

      {/* Comments section - show with critical highlighting */}
      {order.comments && (
        <div 
          className={`order-comments ${hasCritical ? 'has-critical' : ''}`}
          style={hasCritical ? { 
            backgroundColor: '#ffebee', 
            padding: '8px', 
            borderRadius: '4px',
            marginTop: '8px'
          } : { marginTop: '8px' }}
        >
          <strong>Customer: </strong>
          <span style={hasCritical ? { color: '#d32f2f', fontWeight: '600' } : {}}>
            {order.comments}
          </span>
        </div>
      )}

      {/* Notes */}
      {order.notes && (
        <div className="order-notes" style={{ marginTop: '4px', fontSize: '13px', color: '#666' }}>
          <strong>Notes: </strong>{order.notes}
        </div>
      )}

      {/* AI Summary */}
      {order.ai_summary && (
        <div className="ai-summary" style={{ 
          marginTop: '8px', 
          padding: '8px', 
          backgroundColor: '#f5f5f5', 
          borderRadius: '4px',
          fontSize: '13px'
        }}>
          <strong>AI Summary:</strong>
          <div style={{ whiteSpace: 'pre-line', marginTop: '4px' }}>
            {formatAISummary(order.ai_summary)}
          </div>
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
