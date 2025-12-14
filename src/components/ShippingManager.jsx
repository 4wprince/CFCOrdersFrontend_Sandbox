/**
 * ShippingManager.jsx
 * Central hub for shipping method selection and routing
 * v5.9.0 - Fixed routing for all methods
 */

import { useState, useEffect } from 'react'
import RLQuoteHelper from './RLQuoteHelper'
import { CustomerAddress } from './CustomerAddress'
import { API_URL } from '../config'

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
  
  // Determine initial view based on existing method
  const getInitialView = () => {
    const m = shipment?.ship_method
    if (!m) return 'select'
    if (m === 'LTL') return 'rl'
    if (m === 'Pirateship') return 'pirateship'
    if (m === 'LiDelivery') return 'lidelivery'
    if (m === 'BoxTruck') return 'boxtruck'
    if (m === 'Pickup') return 'tracking'
    return 'select'
  }
  
  const [view, setView] = useState(getInitialView())
  
  // Li Delivery pricing
  const [liCost, setLiCost] = useState(shipment?.li_quote_price || '')
  const [liCharge, setLiCharge] = useState(shipment?.li_customer_price || '')
  
  // Box Truck pricing
  const [btCost, setBtCost] = useState(shipment?.quote_price || '')
  const [btCharge, setBtCharge] = useState(shipment?.customer_price || '')

  // Pirateship quote
  const [psQuoteUrl, setPsQuoteUrl] = useState(shipment?.ps_quote_url || '')
  const [psQuotePrice, setPsQuotePrice] = useState(shipment?.ps_quote_price || '')
  const [psSaved, setPsSaved] = useState(!!shipment?.ps_quote_url || !!shipment?.ps_quote_price)
  
  // Load RL data when LTL is selected
  useEffect(() => {
    if (method === 'LTL' && view === 'rl') {
      loadRLData()
    }
  }, [method, view])
  
  // Auto-load RL data if method is already LTL
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
    } else if (newMethod === 'Pickup') {
      setView('tracking')
    } else {
      setView('select')
    }
  }
  
  const handleSave = () => {
    if (onUpdate) onUpdate()
    onClose()
  }
  
  const saveLiPricing = async () => {
    try {
      const params = new URLSearchParams()
      if (liCost) params.append('li_quote_price', liCost)
      if (liCharge) params.append('li_customer_price', liCharge)
      
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

  const savePirateshipQuote = async () => {
    try {
      const params = new URLSearchParams()
      if (psQuoteUrl) params.append('ps_quote_url', psQuoteUrl)
      if (psQuotePrice) params.append('ps_quote_price', psQuotePrice)
      
      await fetch(`${API_URL}/shipments/${shipment.shipment_id}?${params.toString()}`, {
        method: 'PATCH'
      })
      
      setPsSaved(true)
      if (onUpdate) onUpdate()
    } catch (err) {
      console.error('Failed to save Pirateship quote:', err)
    }
  }

  const openPirateshipQuote = () => {
    if (psQuoteUrl) {
      window.open(psQuoteUrl, '_blank')
    }
  }

  const handleChangePsUrl = () => {
    setPsSaved(false)
  }

  const openExternalSite = (url) => {
    window.open(url, '_blank')
  }
  
  // === METHOD SELECTION VIEW ===
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
            <span className="method-desc">UPS/USPS parcels</span>
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
            className={`method-btn ${method === 'Pickup' ? 'active' : ''}`}
            onClick={() => handleMethodChange('Pickup')}
          >
            <span className="method-icon">🏪</span>
            <span className="method-name">Pickup</span>
            <span className="method-desc">Customer picks up</span>
          </button>
          
          <button 
            className={`method-btn ${method === 'LiDelivery' ? 'active' : ''}`}
            onClick={() => handleMethodChange('LiDelivery')}
          >
            <span className="method-icon">🚐</span>
            <span className="method-name">Li Delivery</span>
            <span className="method-desc">Li handles shipping</span>
          </button>
        </div>
      </div>
    )
  }
  
  // === RL CARRIERS VIEW ===
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
  
  // === PIRATESHIP VIEW ===
  if (view === 'pirateship') {
    return (
      <div className="shipping-manager">
        <div className="manager-header">
          <button className="btn btn-back" onClick={() => setView('select')}>← Change Method</button>
          <span className="current-method">Pirateship</span>
        </div>
        
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

          <div className="input-group">
            <label>Shipping Cost ($):</label>
            <input 
              type="number"
              step="0.01"
              value={psQuotePrice}
              onChange={(e) => setPsQuotePrice(e.target.value)}
              placeholder="0.00"
              disabled={psSaved}
            />
          </div>

          <div className="input-group full-width">
            <label>Quote URL (from Pirateship):</label>
            <input 
              type="text"
              value={psQuoteUrl}
              onChange={(e) => setPsQuoteUrl(e.target.value)}
              placeholder="https://ship.pirateship.com/..."
              disabled={psSaved}
            />
          </div>

          <div className="button-row">
            {psSaved ? (
              <>
                <button className="btn btn-success" onClick={openPirateshipQuote}>
                  Open Quote
                </button>
                <button className="btn btn-secondary" onClick={handleChangePsUrl}>
                  Change URL
                </button>
                <button className="btn btn-secondary" onClick={handleSave}>
                  Done
                </button>
              </>
            ) : (
              <>
                <button className="btn btn-success" onClick={savePirateshipQuote}>
                  Save Quote
                </button>
                <button className="btn btn-secondary" onClick={handleSave}>
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  // === LI DELIVERY VIEW ===
  if (view === 'lidelivery') {
    return (
      <div className="shipping-manager">
        <div className="manager-header">
          <button className="btn btn-back" onClick={() => setView('select')}>← Change Method</button>
          <span className="current-method">Li Delivery</span>
        </div>
        
        <div className="li-delivery-helper">
          <h3>Li Delivery Pricing</h3>
          <p className="method-info">Li handles delivery. Enter cost and customer charge for tracking.</p>
          
          <div className="input-grid">
            <div className="input-group">
              <label>Our Cost ($):</label>
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
          
          {liCost && liCharge && (
            <p className="profit-note">
              Profit: ${(parseFloat(liCharge || 0) - parseFloat(liCost || 0)).toFixed(2)}
            </p>
          )}
          
          <button className="btn btn-success" onClick={saveLiPricing}>
            Save Pricing
          </button>
        </div>
      </div>
    )
  }
  
  // === BOX TRUCK VIEW ===
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
  
  // === PICKUP/TRACKING VIEW ===
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
