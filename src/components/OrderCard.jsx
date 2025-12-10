/**
 * OrderCard.jsx
 * Display a single order with status, customer info, shipments, and shipping cost tally
 * v5.8.3 - Added shipping cost summary, restored color coding
 */

import ShipmentRow from './ShipmentRow'

const STATUS_MAP = {
  'needs_payment_link': { label: '1-Need Invoice', color: '#f44336' },
  'awaiting_payment': { label: '2-Awaiting Pay', color: '#ff9800' },
  'needs_warehouse_order': { label: '3-Need to Order', color: '#9c27b0' },
  'awaiting_warehouse': { label: '4-At Warehouse', color: '#2196f3' },
  'needs_bol': { label: '5-Need BOL', color: '#00bcd4' },
  'awaiting_shipment': { label: '6-Ready Ship', color: '#4caf50' },
  'complete': { label: 'Complete', color: '#9e9e9e' }
}

const OrderCard = ({ 
  order, 
  onOpenDetail,
  onOpenShippingManager,
  onUpdate 
}) => {
  const status = STATUS_MAP[order.current_status] || STATUS_MAP['needs_payment_link']
  
  // Get customer display info
  const customerName = order.company_name || order.customer_name || 'Unknown'
  const location = order.city && order.state ? `${order.city}, ${order.state}` : ''
  
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
  
  return (
    <div className="order-card" style={{ borderLeftColor: status.color }}>
      <div className="order-header" onClick={() => onOpenDetail(order)}>
        <div className="order-id">#{order.order_id}</div>
        <div className="order-status" style={{ backgroundColor: status.color + '20', color: status.color }}>
          {status.label}
        </div>
        {order.days_open > 0 && (
          <div className="days-open">{order.days_open}d</div>
        )}
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
