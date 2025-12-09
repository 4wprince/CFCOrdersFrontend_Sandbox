/**
 * ShippingManager.jsx
 * Central hub for shipping method selection and routing
 * v5.8.4 - New tab instead of popup, snap tip, BoxTruck quote
 */

import { useState, useEffect } from 'react'
import RLQuoteHelper from './RLQuoteHelper'
import { CustomerAddress } from './CustomerAddress'

const API_URL = 'https://cfc-backend-b83s.onrender.com'

// Check if we should show the snap tip
const shouldShowSnapTip = () => {
  const tipData = localStorage.getItem('cfc_snap_tip')
  if (!tipData) return true
  
  const { dismissed, firstShown } = JSON.parse(tipData)
  if (dismissed) return false
  
  // Auto-hide after 14 days
  const daysSinceFirst = (Date.now() - firstShown) / (1000 * 60 * 60 * 24)
  return daysSinceFirst < 14
}

const markTipShown = () => {
  const existing = localStorage.getItem('cfc_snap_tip')
  if (!existing) {
    localStorage.setItem('cfc_snap_tip', JSON.stringify({
      dismissed: false,
      firstShown: Date.now()
    }))
  }
}

const dismissTip = () => {
  localStorage.setItem('cfc_snap_tip', JSON.stringify({
    dismissed: true,
    firstShown: Date.now()
  }))
}

const ShippingManager = ({ 
  shipment, 
  orderId,
  customerInfo,
  onClose, 
  onUpdate 
}) => {
  const [method, setMethod] = useState(shipment?.ship_method || '')
  const [rlData, setRlData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showTip, setShowTip] = useState(shouldShowSnapTip())
  
  // Determine initial view based on existing method
  const getInitialView = () => {
    if (!shipment?.ship_method) return 'select'
    if (shipment.ship_method === 'LTL') return 'rl'
    if (shipment.ship_method === 'Pirateship') return 'pirateship'
    if (shipment.ship_method === 'LiDelivery') return 'lidelivery'
    if (shipment.ship_method === 'BoxTruck') return 'boxtruck'
    return 'tracking'
  }
  
  const [view, setView] = useState(getInitialView())
  
  // Li Delivery pricing
  const [liCost, setLiCost] = useState(shipment?.li_quote_price || '200')
  const [liCharge, setLiCharge] = useState(shipment?.li_customer_price || '250')
  
  // Box Truck pricing
  const [btCost, setBtCost] = useState(shipment?.quote_price || '')
  const [btCharge, setBtCharge] = useState(shipment?.customer_price || '')
  
  // Mark tip as shown on mount
  useEffect(() => {
    markTipShown()
  }, [])
  
  // Load RL data when LTL is selected
  useEffect(() => {
    if (method === 'LTL' && view === 'rl') {
      loadRLData()
    }
  }, [method, view])
  
  // Auto-load if method already set
  useEffect(() => {
    if (shipment?.ship_method === 'LTL') {
      setMethod('LTL')
      loadRLData()
    }
  }, [shipment])
  
  const loadRLData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/shipments/${shipment.shipment_id}/rl-quote-data`)
      const data = await res.json()
      if (data.status === 'ok') {
        setRlData(data)
      } else {
        console.error('Failed to load RL data:', data.message)
      }
    } catch (err) {
      console.error('Failed to load RL data:', err)
    }
    setLoading(false)
  }
  
  const handleMethodChange = async (newMethod) => {
    setMethod(newMethod)
    
    // Save method to backend
    try {
      await fetch(`${API_URL}/shipments/${shipment.shipment_id}?ship_method=${newMethod}`, {
        method: 'PATCH'
      })
      if (onUpdate) onUpdate()
    } catch (err) {
      console.error('Failed to update shipping method:', err)
    }
    
    // Route to appropriate view
    if (newMethod === 'LTL') {
      setView('rl')
    } else if (newMethod === 'Pirateship') {
      setView('pirateship')
    } else if (newMethod === 'LiDelivery') {
      setView('lidelivery')
    } else if (newMethod === 'BoxTruck') {
      setView('boxtruck')
    } else {
      setView('tracking')
    }
  }
  
  const handleSave = () => {
    if (onUpdate) onUpdate()
    onClose()
  }
  
  const saveLiPricing = async () => {
    try {
      const params = new URLSearchParams()
      params.append('li_quote_price', liCost)
      params.append('li_customer_price', liCharge)
      
      await fetch(`${API_URL}/shipments/${shipment.shipment_id}?${params.toString()}`, {
        method: 'PATCH'
      })
      
      if (onUpdate) onUpdate()
      onClose()
    } catch (err) {
      console.error('Failed to save Li pricing:', err)
    }
  }
  
 const saveBoxTruckPricing = async () => {
    try {
      const params = new URLSearchParams()
      if (btCost) params.append('quote_price', btCost)
      if (btCharge) params.append('customer_price', btCharge)
      
      await fetch(`${API_URL}/shipments/${shipment.shipment_id}?${params.toString()}`, {
        method: 'PATCH'
      })
      
      if (onUpdate) onUpdate()
      onClose()
    } catch (err) {
      console.error('Failed to save Box Truck pricing:', err)
    }
  }
  
const openExternalSite = (url) => {
    const w = 800
    const h = window.screen.height
    const left = window.screen.width - w
    window.open(url, 'ShippingQuote', `width=${w},height=${h},left=${left},top=0,resizable=yes,scrollbars=yes`)
    
    // Show tip if not dismissed
    if (shouldShowSnapTip()) {
      alert('💡 Tip: Press Win+← on this window, then Win+→ on the quote window to snap side-by-side')
    }
  }
  
  const handleDismissTip = () => {
    dismissTip()
    setShowTip(false)
  }
  
  // Snap tip component
  const SnapTip = () => {
    if (!showTip) return null
    
    return (
      <div className="snap-tip">
        <div className="snap-tip-content">
          <strong>💡 Tip:</strong> Press <kbd>Win</kbd>+<kbd>←</kbd> to snap this window left, 
          then <kbd>Win</kbd>+<kbd>→</kbd> on the other tab to snap right.
        </div>
        <label className="snap-tip-dismiss">
          <input type="checkbox" onChange={handleDismissTip} />
          Don't show again
        </label>
      </div>
    )
  }
  
  // Method selection view
  if (view === 'select') {
    return (
      <div className="shipping-manager">
        <h3>Select Shipping Method</h3>
        <p className="subtitle">Warehouse: {shipment.warehouse}</p>
        
        <div className="method-grid">
          <button 
            className={`method-btn ${method === 'LTL' ? 'active' : ''}`}
            onClick={() => handleMethodChange('LTL')}
          >
            <span className="method-icon">🚛</span>
            <span className="method-name">LTL (RL Carriers)</span>
            <span className="method-desc">Freight shipping</span>
          </button>
          
          <button 
            className={`method-btn ${method === 'Pirateship' ? 'active' : ''}`}
            onClick={() => handleMethodChange('Pirateship')}
          >
            <span className="method-icon">📦</span>
            <span className="method-name">Pirateship</span>
            <span className="method-desc">UPS/USPS parcel</span>
          </button>
          
          <button 
            className={`method-btn ${method === 'Pickup' ? 'active' : ''}`}
            onClick={() => handleMethodChange('Pickup')}
          >
            <span className="method-icon">🏪</span>
            <span className="method-name">Pickup</span>
            <span className="method-desc">Customer picks up</span>
          </button>
          
          <button 
            className={`method-btn ${method === 'BoxTruck' ? 'active' : ''}`}
            onClick={() => handleMethodChange('BoxTruck')}
          >
            <span className="method-icon">🚚</span>
            <span className="method-name">Box Truck</span>
            <span className="method-desc">Local delivery</span>
          </button>
          
          <button 
            className={`method-btn ${method === 'LiDelivery' ? 'active' : ''}`}
            onClick={() => handleMethodChange('LiDelivery')}
          >
            <span className="method-icon">🏭</span>
            <span className="method-name">Li Delivery</span>
            <span className="method-desc">Li handles shipping</span>
          </button>
        </div>
      </div>
    )
  }
  
  // RL Carriers view
  if (view === 'rl') {
    if (loading) {
      return <div className="shipping-manager loading">Loading RL data...</div>
    }
    
    if (!rlData) {
      return (
        <div className="shipping-manager error">
          <p>Failed to load RL data</p>
          <button className="btn" onClick={() => setView('select')}>← Back</button>
        </div>
      )
    }
    
    return (
      <div className="shipping-manager">
        <div className="manager-header">
          <button className="btn btn-back" onClick={() => setView('select')}>← Change Method</button>
          <span className="current-method">LTL (RL Carriers)</span>
        </div>
        
        <SnapTip />
        
        <RLQuoteHelper 
          shipmentId={shipment.shipment_id}
          data={rlData}
          onClose={onClose}
          onSave={handleSave}
          onOpenRL={() => openExternalSite('https://www.rlcarriers.com/freight/shipping/rate-quote')}
        />
      </div>
    )
  }
  
  // Pirateship view
  if (view === 'pirateship') {
    return (
      <div className="shipping-manager">
        <div className="manager-header">
          <button className="btn btn-back" onClick={() => setView('select')}>← Change Method</button>
          <span className="current-method">Pirateship</span>
        </div>
        
        <SnapTip />
        
        <div className="pirateship-helper">
          <h3>Pirateship - Copy Address</h3>
          
          <CustomerAddress 
            destination={customerInfo}
            title="Ship To"
          />
          
          <div className="pirateship-actions">
            <button 
              className="btn btn-primary" 
              onClick={() => openExternalSite('https://ship.pirateship.com/ship/single')}
            >
              Open Pirateship →
            </button>
          </div>
          
          <button className="btn btn-success" onClick={handleSave}>
            Done
          </button>
        </div>
      </div>
    )
  }
  
  // Li Delivery view
  if (view === 'lidelivery') {
    return (
      <div className="shipping-manager">
        <div className="manager-header">
          <button className="btn btn-back" onClick={() => setView('select')}>← Change Method</button>
          <span className="current-method">Li Delivery</span>
        </div>
        
        <div className="li-delivery-helper">
          <h3>Li Delivery Pricing</h3>
          <p className="method-info">Li handles delivery. Enter quote for cost tracking.</p>
          
          <div className="input-grid">
            <div className="input-group">
              <label>Li Cost ($):</label>
              <input 
                type="number"
                step="0.01"
                value={liCost}
                onChange={(e) => setLiCost(e.target.value)}
                placeholder="200.00"
              />
            </div>
            
            <div className="input-group">
              <label>Customer Charge ($):</label>
              <input 
                type="number"
                step="0.01"
                value={liCharge}
                onChange={(e) => setLiCharge(e.target.value)}
                placeholder="250.00"
              />
            </div>
          </div>
          
          <p className="profit-note">
            Profit: ${(parseFloat(liCharge || 0) - parseFloat(liCost || 0)).toFixed(2)}
          </p>
          
          <button className="btn btn-success" onClick={saveLiPricing}>
            Save Pricing
          </button>
        </div>
      </div>
    )
  }
  
  // Box Truck view
  if (view === 'boxtruck') {
    return (
      <div className="shipping-manager">
        <div className="manager-header">
          <button className="btn btn-back" onClick={() => setView('select')}>← Change Method</button>
          <span className="current-method">Box Truck</span>
        </div>
        
        <div className="boxtruck-helper">
          <h3>Box Truck Pricing</h3>
          <p className="method-info">Local delivery via box truck.</p>
          
          <div className="input-grid">
            <div className="input-group">
              <label>Our Cost ($):</label>
              <input 
                type="number"
                step="0.01"
                value={btCost}
                onChange={(e) => setBtCost(e.target.value)}
                placeholder="0.00"
              />
            </div>
            
            <div className="input-group">
              <label>Customer Charge ($):</label>
              <input 
                type="number"
                step="0.01"
                value={btCharge}
                onChange={(e) => setBtCharge(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          
          {btCost && btCharge && (
            <p className="profit-note">
              Profit: ${(parseFloat(btCharge || 0) - parseFloat(btCost || 0)).toFixed(2)}
            </p>
          )}
          
          <button className="btn btn-success" onClick={saveBoxTruckPricing}>
            Save Pricing
          </button>
        </div>
      </div>
    )
  }
  
  // Simple tracking view (Pickup)
  if (view === 'tracking') {
    return (
      <div className="shipping-manager">
        <div className="manager-header">
          <button className="btn btn-back" onClick={() => setView('select')}>← Change Method</button>
          <span className="current-method">{method}</span>
        </div>
        
        <div className="tracking-simple">
          {method === 'Pickup' && (
            <p className="method-info">Customer will pick up from warehouse. Mark as complete when picked up.</p>
          )}
          
          <button className="btn btn-success" onClick={handleSave}>
            Done
          </button>
        </div>
      </div>
    )
  }
  
  return null
}

export default ShippingManager
