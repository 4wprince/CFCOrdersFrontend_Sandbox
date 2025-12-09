/**
 * App.jsx - Main Application
 * v5.8.1 - Refactored with components
 * 
 * Orchestrates:
 * - Login/auth
 * - Order loading
 * - Component rendering
 * - Modal management
 */

import { useState, useEffect } from 'react'
import StatusBar from './components/StatusBar'
import OrderCard from './components/OrderCard'
import ShippingManager from './components/ShippingManager'

const API_URL = 'https://cfc-backend-b83s.onrender.com'
const APP_PASSWORD = 'cfc2025'

// Status mapping for display
const STATUS_MAP = {
  'needs_payment_link': { label: '1-Need Invoice', class: 'needs-invoice' },
  'awaiting_payment': { label: '2-Awaiting Pay', class: 'awaiting-pay' },
  'needs_warehouse_order': { label: '3-Need to Order', class: 'needs-order' },
  'awaiting_warehouse': { label: '4-At Warehouse', class: 'at-warehouse' },
  'needs_bol': { label: '5-Need BOL', class: 'needs-bol' },
  'awaiting_shipment': { label: '6-Ready Ship', class: 'ready-ship' },
  'complete': { label: 'Complete', class: 'complete' }
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

function App() {
  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  
  // Data state
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Filter state
  const [statusFilter, setStatusFilter] = useState(null)
  const [showArchived, setShowArchived] = useState(false)
  
  // Modal state
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [shippingModal, setShippingModal] = useState(null) // { shipment, customerInfo }
  
  // Check saved login
  useEffect(() => {
    const saved = localStorage.getItem('cfc_logged_in')
    if (saved === 'true') {
      setIsLoggedIn(true)
    }
  }, [])
  
  // Load data when logged in
  useEffect(() => {
    if (isLoggedIn) {
      loadOrders()
    }
  }, [isLoggedIn])
  
  // === AUTH ===
  
  const handleLogin = (e) => {
    e.preventDefault()
    if (password === APP_PASSWORD) {
      setIsLoggedIn(true)
      localStorage.setItem('cfc_logged_in', 'true')
      setLoginError('')
    } else {
      setLoginError('Incorrect password')
    }
  }
  
  const handleLogout = () => {
    setIsLoggedIn(false)
    localStorage.removeItem('cfc_logged_in')
  }
  
  // === DATA LOADING ===
  
  const loadOrders = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/orders?limit=200&include_complete=true`)
      const data = await res.json()
      if (data.orders) {
        setOrders(data.orders)
      }
    } catch (err) {
      console.error('Failed to load orders:', err)
    }
    setLoading(false)
  }
  
  // === FILTERING ===
  
const getFilteredOrders = () => {
    let filtered = orders
    
    // Filter by status
    if (statusFilter) {
      filtered = filtered.filter(o => o.current_status === statusFilter)
    } else if (showArchived) {
      // Show ONLY complete/archived orders
      filtered = filtered.filter(o => o.current_status === 'complete')
    } else {
      // Hide complete orders (show active only)
      filtered = filtered.filter(o => o.current_status !== 'complete')
    }
    
    return filtered
  }
  
  // === STATUS UPDATES ===
  
  const updateOrderStatus = async (orderId, field, value) => {
    try {
      await fetch(`${API_URL}/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      })
      loadOrders()
    } catch (err) {
      console.error('Failed to update order:', err)
    }
  }
  
  // === MODALS ===
  
  const openOrderDetail = (order) => {
    setSelectedOrder(order)
  }
  
  const closeOrderDetail = () => {
    setSelectedOrder(null)
  }
  
  const openShippingManager = (shipment, order) => {
    setShippingModal({
      shipment,
      orderId: order?.order_id || shipment.order_id,
      customerInfo: {
        name: order?.company_name || order?.customer_name || '',
        street: order?.street || '',
        city: order?.city || '',
        state: order?.state || '',
        zip: order?.zip_code || '',
        phone: order?.phone || '',
        email: order?.email || ''
      }
    })
  }
  
  const closeShippingManager = () => {
    setShippingModal(null)
    loadOrders()
  }
  
  // === RENDER: LOGIN ===
  
  if (!isLoggedIn) {
    return (
      <div className="login-container">
        <form onSubmit={handleLogin} className="login-form">
          <h1>CFC Orders</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            autoFocus
          />
          <button type="submit">Login</button>
          {loginError && <div className="error">{loginError}</div>}
        </form>
      </div>
    )
  }
  
  // === RENDER: MAIN APP ===
  
  const filteredOrders = getFilteredOrders()
  
  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <h1>CFC Orders</h1>
        <div className="header-actions">
          <button onClick={loadOrders} disabled={loading}>
            {loading ? 'Loading...' : '↻ Refresh'}
          </button>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </header>
      
      {/* Status Filter Bar */}
      <StatusBar 
        orders={orders}
        activeFilter={statusFilter}
        onFilterChange={setStatusFilter}
        showArchived={showArchived}
        onToggleArchived={setShowArchived}
      />
      
      {/* Orders Grid */}
      <main className="orders-grid">
        {loading ? (
          <div className="loading">Loading orders...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="empty">No orders found</div>
        ) : (
          filteredOrders.map(order => (
            <OrderCard 
              key={order.order_id}
              order={order}
              onOpenDetail={openOrderDetail}
              onOpenShippingManager={(shipment) => openShippingManager(shipment, order)}
              onUpdate={loadOrders}
            />
          ))
        )}
      </main>
      
      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={closeOrderDetail}>
          <div className="modal order-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Order #{selectedOrder.order_id}</h2>
              <button className="modal-close" onClick={closeOrderDetail}>×</button>
            </div>
            <div className="modal-body">
              {/* Customer Info */}
              <div className="detail-section">
                <h3>Customer</h3>
                <p><strong>{selectedOrder.company_name || selectedOrder.customer_name}</strong></p>
                <p>{selectedOrder.street}</p>
                <p>{selectedOrder.city}, {selectedOrder.state} {selectedOrder.zip_code}</p>
                <p>{selectedOrder.phone}</p>
                <p>{selectedOrder.email}</p>
              </div>
              
              {/* Order Info */}
              <div className="detail-section">
                <h3>Order Details</h3>
                <p>Total: ${parseFloat(selectedOrder.order_total || 0).toFixed(2)}</p>
                <p>Date: {new Date(selectedOrder.order_date).toLocaleDateString()}</p>
                <p>Days Open: {selectedOrder.days_open}</p>
              </div>
              
              {/* Status Controls */}
              <div className="detail-section">
                <h3>Status</h3>
                <div className="status-checkboxes">
                  {[
                    { field: 'payment_link_sent', label: '1. Invoice Sent' },
                    { field: 'payment_received', label: '2. Payment Received' },
                    { field: 'sent_to_warehouse', label: '3. Sent to Warehouse' },
                    { field: 'warehouse_confirmed', label: '4. Warehouse Confirmed' },
                    { field: 'bol_sent', label: '5. BOL Sent' },
                    { field: 'is_complete', label: '6. Complete' }
                  ].map(({ field, label }) => (
                    <label key={field} className="checkbox-row">
                      <input 
                        type="checkbox"
                        checked={selectedOrder[field] || false}
                        onChange={(e) => updateOrderStatus(selectedOrder.order_id, field, e.target.checked)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Shipments */}
              {selectedOrder.shipments && selectedOrder.shipments.length > 0 && (
                <div className="detail-section">
                  <h3>Shipments</h3>
                  {selectedOrder.shipments.map((shipment, i) => (
                    <div key={i} className="shipment-detail">
                      <strong>{shipment.warehouse}</strong>
                      <span>{shipment.status || 'pending'}</span>
                      <span>{shipment.ship_method || 'Not set'}</span>
                      <button 
                        className="btn btn-sm"
                        onClick={() => openShippingManager(shipment, selectedOrder)}
                      >
                        Manage Shipping
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Notes */}
              {selectedOrder.comments && (
                <div className="detail-section">
                  <h3>Comments</h3>
                  <p>{selectedOrder.comments}</p>
                </div>
              )}
              
              {/* AI Summary */}
              {selectedOrder.ai_summary && (
                <div className="detail-section">
                  <h3>AI Summary</h3>
                  <pre className="ai-summary">{selectedOrder.ai_summary}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Shipping Manager Modal */}
      {shippingModal && (
        <div className="modal-overlay shipping-modal-overlay" onClick={closeShippingManager}>
          <div className="modal shipping-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Shipping - {shippingModal.shipment.warehouse}</h2>
              <button className="modal-close" onClick={closeShippingManager}>×</button>
            </div>
            <div className="modal-body">
              <ShippingManager 
                shipment={shippingModal.shipment}
                orderId={shippingModal.orderId}
                customerInfo={shippingModal.customerInfo}
                onClose={closeShippingManager}
                onUpdate={loadOrders}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
