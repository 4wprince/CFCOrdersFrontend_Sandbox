/**
 * StatusBar.jsx
 * Top status filter buttons with counts and color coding
 * v5.9.1 - Uses helper files, adds Sync AI button
 */

import { useState } from 'react'
import { 
  STATUS_MAP, 
  ACTIVE_STATUSES, 
  getStatusButtonStyle 
} from '../helpers/statusHelpers'
import { syncAllAISummaries } from '../helpers/syncHelpers'
import { API_URL } from '../config'

const StatusBar = ({ orders, activeFilter, onFilterChange, showArchived, onToggleArchived, onRefresh }) => {
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')

  if (!Array.isArray(orders)) return null

  // Count orders by status
  const counts = {}
  Object.keys(STATUS_MAP).forEach(key => {
    counts[key] = orders.filter(o => o.current_status === key).length
  })

  // Active orders (not complete or canceled)
  const activeCount = orders.filter(o => ACTIVE_STATUSES.includes(o.current_status)).length
  const archivedCount = (counts['complete'] || 0) + (counts['canceled'] || 0)

  // Handle Sync AI button
  const handleSyncAI = async () => {
    setSyncing(true)
    setSyncMessage('Syncing...')
    
    const result = await syncAllAISummaries(API_URL, false)
    
    if (result.success) {
      setSyncMessage(result.message)
      if (onRefresh) onRefresh()
    } else {
      setSyncMessage('Sync failed: ' + result.error)
    }
    
    setSyncing(false)
    
    // Clear message after 5 seconds
    setTimeout(() => setSyncMessage(''), 5000)
  }

  return (
    <div className="status-bar">
      <div className="status-filters">
        {/* All Active button */}
        <button
          className={`filter-btn ${!activeFilter && !showArchived ? 'active' : ''}`}
          onClick={() => {
            onFilterChange(null)
            onToggleArchived(false)
          }}
          style={!activeFilter && !showArchived ? { 
            backgroundColor: '#1976d2', 
            color: '#fff',
            borderColor: '#1976d2'
          } : {}}
        >
          All Active ({activeCount})
        </button>

        {/* Status buttons - color coded */}
        {ACTIVE_STATUSES.map(key => {
          const status = STATUS_MAP[key]
          const isActive = activeFilter === key
          
          return (
            <button
              key={key}
              className={`filter-btn ${isActive ? 'active' : ''}`}
              onClick={() => {
                onFilterChange(key)
                onToggleArchived(false)
              }}
              style={getStatusButtonStyle(key, isActive)}
            >
              {status.label} ({counts[key] || 0})
            </button>
          )
        })}

        {/* Archived button */}
        <button
          className={`filter-btn archived-btn ${showArchived ? 'active' : ''}`}
          onClick={() => {
            onToggleArchived(!showArchived)
            onFilterChange(null)
          }}
          style={showArchived ? {
            backgroundColor: '#9e9e9e',
            color: '#fff',
            borderColor: '#9e9e9e'
          } : {
            borderColor: '#9e9e9e',
            color: '#9e9e9e'
          }}
        >
          Archived ({archivedCount})
        </button>
      </div>

      {/* Sync AI button */}
      <div className="sync-actions">
        <button
          className="btn btn-sync-ai"
          onClick={handleSyncAI}
          disabled={syncing}
          title="Regenerate AI summaries for all active orders"
        >
          {syncing ? '⏳ Syncing...' : '🤖 Sync AI'}
        </button>
        {syncMessage && (
          <span className="sync-message">{syncMessage}</span>
        )}
      </div>
    </div>
  )
}

export default StatusBar
