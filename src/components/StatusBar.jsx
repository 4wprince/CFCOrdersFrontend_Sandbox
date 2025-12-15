/**
 * StatusBar.jsx
 * Top status filter buttons with counts
 * v5.9.2 - Added Sync AI button, no external helpers
 */

import { useState } from 'react'
import { API_URL } from '../config'

const STATUS_MAP = {
  needs_payment_link: { label: '1-Need Invoice', class: 'needs-payment-link', color: '#f44336' },
  awaiting_payment: { label: '2-Awaiting Pay', class: 'awaiting-payment', color: '#ff9800' },
  needs_warehouse_order: { label: '3-Need to Order', class: 'needs-warehouse-order', color: '#9c27b0' },
  awaiting_warehouse: { label: '4-At Warehouse', class: 'awaiting-warehouse', color: '#2196f3' },
  needs_bol: { label: '5-Need BOL', class: 'needs-bol', color: '#00bcd4' },
  awaiting_shipment: { label: '6-Ready Ship', class: 'awaiting-shipment', color: '#4caf50' },
  complete: { label: 'Complete', class: 'complete', color: '#9e9e9e' }
}

const ACTIVE_STATUSES = [
  'needs_payment_link',
  'awaiting_payment',
  'needs_warehouse_order',
  'awaiting_warehouse',
  'needs_bol',
  'awaiting_shipment'
]

const StatusBar = ({ orders, activeFilter, onFilterChange, showArchived, onToggleArchived, onRefresh }) => {
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')

  if (!Array.isArray(orders)) return null

  // Count orders by status
  const counts = {}
  Object.keys(STATUS_MAP).forEach(key => {
    counts[key] = orders.filter(o => o.current_status === key).length
  })

  // Active orders (not complete)
  const activeCount = orders.filter(o => ACTIVE_STATUSES.includes(o.current_status)).length
  const completeCount = counts['complete'] || 0

  // Handle Sync AI button
  const handleSyncAI = async () => {
    setSyncing(true)
    setSyncMessage('Syncing...')
    
    try {
      const response = await fetch(`${API_URL}/orders/regenerate-summaries`, { method: 'POST' })
      if (response.ok) {
        const data = await response.json()
        setSyncMessage(`Synced ${data.results?.success || 0} of ${data.results?.total || 0} orders`)
        if (onRefresh) onRefresh()
      } else {
        setSyncMessage('Sync failed')
      }
    } catch (err) {
      setSyncMessage('Sync error: ' + err.message)
    }
    
    setSyncing(false)
    setTimeout(() => setSyncMessage(''), 5000)
  }

  return (
    <div className="status-bar">
      <div className="status-filters">
        {/* All Active */}
        <button
          className={`filter-btn ${!activeFilter && !showArchived ? 'active' : ''}`}
          onClick={() => {
            onFilterChange(null)
            onToggleArchived(false)
          }}
        >
          All Active ({activeCount})
        </button>

        {/* Status buttons */}
        {ACTIVE_STATUSES.map(key => {
          const status = STATUS_MAP[key]
          return (
            <button
              key={key}
              className={`filter-btn status-${status.class} ${activeFilter === key ? 'active' : ''}`}
              onClick={() => {
                onFilterChange(key)
                onToggleArchived(false)
              }}
              style={activeFilter === key ? { 
                backgroundColor: status.color, 
                color: '#fff',
                borderColor: status.color
              } : {
                borderColor: status.color,
                color: status.color
              }}
            >
              {status.label} ({counts[key] || 0})
            </button>
          )
        })}

        {/* Archived */}
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

      {/* Sync AI button */}
      <div className="sync-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          className="btn btn-sync-ai"
          onClick={handleSyncAI}
          disabled={syncing}
          style={{
            padding: '8px 16px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: '500',
            cursor: syncing ? 'not-allowed' : 'pointer',
            opacity: syncing ? 0.7 : 1
          }}
        >
          {syncing ? '⏳ Syncing...' : '🤖 Sync AI'}
        </button>
        {syncMessage && (
          <span style={{ fontSize: '12px', color: '#666' }}>{syncMessage}</span>
        )}
      </div>
    </div>
  )
}

export default StatusBar
