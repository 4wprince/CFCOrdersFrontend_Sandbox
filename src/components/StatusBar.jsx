/**
 * StatusBar.jsx
 * Top status filter buttons with counts
 */

import { STATUS_MAP } from '../../utils/constants'

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
