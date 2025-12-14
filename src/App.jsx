/**
 * App.jsx - Main Application
 * v5.9.0 - Fixed status updates, removed broken modal checkboxes
 */

import { useState, useEffect } from 'react'
import StatusBar from './components/StatusBar'
import OrderCard from './components/OrderCard'
import ShippingManager from './components/ShippingManager'

import { API_URL, APP_PASSWORD } from './config'

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
  const [shippingModal, setShippingModal] = useState(null)

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
    let filtered = orders || []

    if (statusFilter) {
      filtered = filtered.filter(o => o && o.current_status === statusFilter)
    } else if (showArchived) {
      filtered = filtered.filter(o => o && o.current_status === 'complete')
    } else {
      filtered = filtered.filter(o => o && o.current_status !== 'complete')
    }

    return filtered
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

  // === RENDER: LOADING STATE ===

  if (loading) {
    return <div className="loading">Loading orders...</div>
  }

  if (!Array.isArray(orders)) {
    return <div className="loading">Loading orders...</div>
  }

  // === RENDER: MAIN APP ===

  const result = getFilteredOrders()
  const filteredOrders = Array.isArray(result) ? result : []

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <h1>CFC Orders</h1>
        <div className="header-actions">
          <button onClick={loadOrders} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
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
        {filteredOrders.length === 0 ? (
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

      {/* Order Detail Modal - Customer info and address copy */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={closeOrderDetail}>
          <div className="modal order-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Order #{selectedOrder.order_id}</h2>
              <button className="modal-close" onClick={closeOrderDetail}>×</button>
            </div>
            <div className="modal-body">
              {/* Customer Info with Copy buttons */}
              <div className="detail-section">
                <h3>Customer - Click to Copy</h3>
                <div className="copy-field" onClick={() => navigator.clipboard.writeText(selectedOrder.company_name || selectedOrder.customer_name || '')}>
                  <span className="label">Name:</span>
                  <span className="value">{selectedOrder.company_name || selectedOrder.customer_name}</span>
                  <span className="copy-icon">📋</span>
                </div>
                <div className="copy-field" onClick={() => navigator.clipboard.writeText(selectedOrder.street || '')}>
                  <span className="label">Street:</span>
                  <span className="value">{selectedOrder.street}</span>
                  <span className="copy-icon">📋</span>
                </div>
                <div className="copy-field" onClick={() => navigator.clipboard.writeText(selectedOrder.city || '')}>
                  <span className="label">City:</span>
                  <span className="value">{selectedOrder.city}</span>
                  <span className="copy-icon">📋</span>
                </div>
                <div className="copy-field" onClick={() => navigator.clipboard.writeText(selectedOrder.state || '')}>
                  <span className="label">State:</span>
                  <span className="value">{selectedOrder.state}</span>
                  <span className="copy-icon">📋</span>
                </div>
                <div className="copy-field" onClick={() => navigator.clipboard.writeText(selectedOrder.zip_code || '')}>
                  <span className="label">ZIP:</span>
                  <span className="value">{selectedOrder.zip_code}</span>
                  <span className="copy-icon">📋</span>
                </div>
                <div className="copy-field" onClick={() => navigator.clipboard.writeText(selectedOrder.phone || '')}>
                  <span className="label">Phone:</span>
                  <span className="value">{selectedOrder.phone}</span>
                  <span className="copy-icon">📋</span>
                </div>
                <div className="copy-field" onClick={() => navigator.clipboard.writeText(selectedOrder.email || '')}>
                  <span className="label">Email:</span>
                  <span className="value">{selectedOrder.email}</span>
                  <span className="copy-icon">📋</span>
                </div>
              </div>

              {/* Order Info */}
              <div className="detail-section">
                <h3>Order Details</h3>
                <p>Total: ${parseFloat(selectedOrder.order_total || 0).toFixed(2)}</p>
                <p>Date: {new Date(selectedOrder.order_date).toLocaleDateString()}</p>
                <p>Days Open: {selectedOrder.days_open}</p>
                <p>Status: {selectedOrder.current_status}</p>
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
