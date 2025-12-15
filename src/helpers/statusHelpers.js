/**
 * statusHelpers.js
 * Centralized status definitions, colors, and helper functions
 * v5.9.1 - Modular helper file
 */

// Status colors for progression
export const STATUS_COLORS = {
  needs_payment_link: '#f44336',    // Red - urgent, needs action
  awaiting_payment: '#ff9800',       // Orange - waiting
  needs_warehouse_order: '#9c27b0',  // Purple - needs order
  awaiting_warehouse: '#2196f3',     // Blue - at warehouse
  needs_bol: '#00bcd4',              // Cyan - needs BOL
  awaiting_shipment: '#4caf50',      // Green - ready to ship
  complete: '#9e9e9e',               // Gray - done
  canceled: '#795548'                // Brown - canceled
}

// Status configuration map
export const STATUS_MAP = {
  needs_payment_link: { 
    label: '1-Need Invoice', 
    color: STATUS_COLORS.needs_payment_link,
    class: 'needs-payment-link'
  },
  awaiting_payment: { 
    label: '2-Awaiting Pay', 
    color: STATUS_COLORS.awaiting_payment,
    class: 'awaiting-payment'
  },
  needs_warehouse_order: { 
    label: '3-Need to Order', 
    color: STATUS_COLORS.needs_warehouse_order,
    class: 'needs-warehouse-order'
  },
  awaiting_warehouse: { 
    label: '4-At Warehouse', 
    color: STATUS_COLORS.awaiting_warehouse,
    class: 'awaiting-warehouse'
  },
  needs_bol: { 
    label: '5-Need BOL', 
    color: STATUS_COLORS.needs_bol,
    class: 'needs-bol'
  },
  awaiting_shipment: { 
    label: '6-Ready Ship', 
    color: STATUS_COLORS.awaiting_shipment,
    class: 'awaiting-shipment'
  },
  complete: { 
    label: 'Complete', 
    color: STATUS_COLORS.complete,
    class: 'complete'
  },
  canceled: { 
    label: 'Canceled', 
    color: STATUS_COLORS.canceled,
    class: 'canceled'
  }
}

// Options for dropdowns
export const STATUS_OPTIONS = [
  { value: 'needs_payment_link', label: '1-Need Invoice', color: STATUS_COLORS.needs_payment_link },
  { value: 'awaiting_payment', label: '2-Awaiting Pay', color: STATUS_COLORS.awaiting_payment },
  { value: 'needs_warehouse_order', label: '3-Need to Order', color: STATUS_COLORS.needs_warehouse_order },
  { value: 'awaiting_warehouse', label: '4-At Warehouse', color: STATUS_COLORS.awaiting_warehouse },
  { value: 'needs_bol', label: '5-Need BOL', color: STATUS_COLORS.needs_bol },
  { value: 'awaiting_shipment', label: '6-Ready Ship', color: STATUS_COLORS.awaiting_shipment },
  { value: 'complete', label: 'Complete', color: STATUS_COLORS.complete },
  { value: 'canceled', label: 'Canceled', color: STATUS_COLORS.canceled }
]

// Active statuses (not archived)
export const ACTIVE_STATUSES = [
  'needs_payment_link',
  'awaiting_payment', 
  'needs_warehouse_order',
  'awaiting_warehouse',
  'needs_bol',
  'awaiting_shipment'
]

// Shipment status options (backend values)
export const SHIPMENT_STATUS_OPTIONS = [
  { value: 'needs_order', label: 'Pending' },
  { value: 'at_warehouse', label: 'At Warehouse' },
  { value: 'needs_bol', label: 'Needs BOL' },
  { value: 'ready_ship', label: 'Ready Ship' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' }
]

// Shipping method options
export const SHIP_METHOD_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'LTL', label: 'LTL' },
  { value: 'Pirateship', label: 'Pirateship' },
  { value: 'Pickup', label: 'Pickup' },
  { value: 'BoxTruck', label: 'BoxTruck' },
  { value: 'LiDelivery', label: 'Li_Delivery' }
]

// Get status info by value
export const getStatusInfo = (statusValue) => {
  return STATUS_MAP[statusValue] || STATUS_MAP.needs_payment_link
}

// Get color for status
export const getStatusColor = (statusValue) => {
  return STATUS_COLORS[statusValue] || STATUS_COLORS.needs_payment_link
}

// Check if status is active (not complete or canceled)
export const isActiveStatus = (statusValue) => {
  return ACTIVE_STATUSES.includes(statusValue)
}

// Get age label from order date
export const getAgeLabel = (orderDate) => {
  if (!orderDate) return ''

  const created = new Date(orderDate)
  const today = new Date()

  // Normalize to midnight
  created.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)

  const diffDays = Math.floor((today - created) / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) return 'Today'
  if (diffDays === 1) return '1 Day'
  return `${diffDays} Days`
}

// Generate CSS for color-coded dropdown option
export const getDropdownOptionStyle = (statusValue) => {
  const color = getStatusColor(statusValue)
  return {
    color: color,
    fontWeight: '500'
  }
}

// Generate CSS for status button
export const getStatusButtonStyle = (statusValue, isActive = false) => {
  const color = getStatusColor(statusValue)
  return {
    backgroundColor: isActive ? color : 'transparent',
    color: isActive ? '#fff' : color,
    borderColor: color,
    borderWidth: '2px',
    borderStyle: 'solid'
  }
}
