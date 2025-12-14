/**
 * StatusBar.jsx
 * Top status filter buttons with counts
 * v5.8.4 - Show Completed as button not checkbox
 */

const STATUS_MAP = {
  'needs_payment_link': { label: '1-Need Invoice', class: 'needs-invoice' },
  'awaiting_payment': { label: '2-Awaiting Pay', class: 'awaiting-pay' },
  'needs_warehouse_order': { label: '3-Need to Order', class: 'needs-order' },
  'awaiting_warehouse': { label: '4-At Warehouse', class: 'at-warehouse' },
  'needs_bol': { label: '5-Need BOL', class: 'needs-bol' },
  'awaiting_shipment': { label: '6-Ready Ship', class: 'ready-ship' },
  'complete': { label: 'Complete', class: 'complete' }
}

const StatusBar = ({ orders, activeFilter, onFilterChange, showArchived, onToggleArchived }) => {
  // Count orders by status
  const counts = {}
  Object.keys(STATUS_MAP).forEach(key => {
    counts[key] = orders.filter(o => o.current_status === key).length
  })
  
  // Active orders (not complete)
  const activeCount = orders.filter(o => o.current_status !== 'complete').length
  const completeCount = counts['complete'] || 0
  
  return (
    <div className="status-bar">
      <div className="status-filters">
        <button 
          className={`filter-btn ${!activeFilter && !showArchived ? 'active' : ''}`}
          onClick={() => {
            onFilterChange(null)
            onToggleArchived(false)
          }}
        >
          All Active ({activeCount})
        </button>
        
        {Object.entries(STATUS_MAP).filter(([key]) => key !== 'complete').map(([key, value]) => (
          <button 
            key={key}
            className={`filter-btn status-${value.class} ${activeFilter === key ? 'active' : ''}`}
            onClick={() => {
              onFilterChange(key)
              onToggleArchived(false)
            }}
          >
            {value.label} ({counts[key] || 0})
          </button>
        ))}
        
        <button 
          className={`filter-btn archived-btn ${showArchived ? 'active' : ''}`}
          onClick={() => {
            onToggleArchived(!showArchived)
            onFilterChange(null)
          }}
        >
          Archived ({completeCount})
        </button>
      </div>
    </div>
  )
}

export default StatusBar
