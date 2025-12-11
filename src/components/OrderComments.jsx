/**
 * OrderComments.jsx
 * Display and edit internal notes for an order
 * v1.0.1 - Fixed fetch syntax
 */

import { useState } from 'react'

const API_URL = 'https://cfc-backend-b83s.onrender.com'

const OrderComments = ({ order, onUpdate }) => {
  const [notes, setNotes] = useState(order.notes || '')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isRefreshingSummary, setIsRefreshingSummary] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await fetch(`${API_URL}/orders/${order.order_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      })
      // Auto-refresh AI summary after saving notes
      await fetch(`${API_URL}/orders/${order.order_id}/generate-summary?force=true`, {
        method: 'POST'
      })
      setIsEditing(false)
      if (onUpdate) onUpdate()
    } catch (err) {
      console.error('Failed to save notes:', err)
    }
    setIsSaving(false)
  }

  const handleRefreshSummary = async () => {
    setIsRefreshingSummary(true)
    try {
      await fetch(`${API_URL}/orders/${order.order_id}/generate-summary?force=true`, {
        method: 'POST'
      })
      if (onUpdate) onUpdate()
    } catch (err) {
      console.error('Failed to refresh summary:', err)
    }
    setIsRefreshingSummary(false)
  }

  return (
    <div className="order-comments">
      {/* Customer Comments (from B2BWave - read only) */}
      {order.comments && (
        <div className="comments-section">
          <h4>Customer Comments</h4>
          <p className="customer-comments">{order.comments}</p>
        </div>
      )}

      {/* Internal Notes (editable) */}
      <div className="comments-section">
        <div className="section-header">
          <h4>Internal Notes</h4>
          {!isEditing && (
            <button 
              className="btn btn-sm btn-secondary"
              onClick={() => setIsEditing(true)}
            >
              {notes ? 'Edit' : 'Add Note'}
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="notes-editor">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add internal notes... (e.g., 'Combine with order 5124', 'Customer called - rush order')"
              rows={4}
            />
            <div className="editor-actions">
              <button 
                className="btn btn-sm btn-success"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button 
                className="btn btn-sm btn-secondary"
                onClick={() => {
                  setNotes(order.notes || '')
                  setIsEditing(false)
                }}
                disabled={isSaving}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          notes && <p className="internal-notes">{notes}</p>
        )}
      </div>

      {/* AI Summary */}
      <div className="comments-section">
        <div className="section-header">
          <h4>AI Summary</h4>
          <button 
            className="btn btn-sm btn-secondary"
            onClick={handleRefreshSummary}
            disabled={isRefreshingSummary}
          >
            {isRefreshingSummary ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        {order.ai_summary ? (
          <pre className="ai-summary">{order.ai_summary}</pre>
        ) : (
          <p className="no-summary">No AI summary yet. Click Refresh to generate.</p>
        )}
      </div>
    </div>
  )
}

export default OrderComments
