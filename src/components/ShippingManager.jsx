/**
 * ShippingManager.jsx
 * Central hub for shipping method selection and routing
 * v5.9.1 - Opens in new window (not tab), fixed Li Delivery layout
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
      openNewWindow(psQuoteUrl)
    }
  }

  const handleChangePsUrl = () => {
    setPsSaved(false)
  }

  // Open in NEW WINDOW (not tab) - snapped to right side of screen
  const openNewWindow = (url) => {
    const width = 800
    const height = window.screen.height
    const left = window.screen.width - width
    window.open(url, 'ShippingQuote', `width=${width},height=${height},left=${left},top=0,resizable=yes,scrollbars=yes`)
  }

  // Common input styles
  const inputStyle = {
    width: '100%',
    padding: '8px 10px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '14px',
    marginTop: '4px'
  }

  const labelStyle = {
    display: 'block',
    marginBottom: '4px',
    fontWeight: '600',
    fontSize: '13px'
  }

  const inputGroupStyle = {
    marginBottom: '12px'
  }
  
  // === METHOD SELECTION VIEW ===
  if (view === 'select') {
    return (
      <div className="shipping-manager">
        <h3>Select Shipping Method</h3>
        <p className="subtitle">Warehouse: {shipment.warehouse}</p>
        
        <div className="method-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '16px' }}>
          <button 
            className={`method-btn ${method === 'LTL' ? 'active' : ''}`}
            onClick={() => handleMethodChange('LTL')}
            style={{ padding: '12px', borderRadius: '8px', border: '2px solid #ccc', cursor: 'pointer', textAlign: 'left' }}
          >
            <span style={{ fontSize: '20px' }}>🚛</span>
            <div style={{ fontWeight: '600' }}>LTL (RL Carriers)</div>
            <div style={{ fontSize: '12px', color: '#666' }}>Freight shipping</div>
          </button>
          
          <button 
            className={`method-btn ${method === 'Pirateship' ? 'active' : ''}`}
            onClick={() => handleMethodChange('Pirateship')}
            style={{ padding: '12px', borderRadius: '8px', border: '2px solid #ccc', cursor: 'pointer', textAlign: 'left' }}
          >
            <span style={{ fontSize: '20px' }}>📦</span>
            <div style={{ fontWeight: '600' }}>Pirateship</div>
            <div style={{ fontSize: '12px', color: '#666' }}>UPS/USPS parcels</div>
          </button>
          
          <button 
            className={`method-btn ${method === 'BoxTruck' ? 'active' : ''}`}
            onClick={() => handleMethodChange('BoxTruck')}
            style={{ padding: '12px', borderRadius: '8px', border: '2px solid #ccc', cursor: 'pointer', textAlign: 'left' }}
          >
            <span style={{ fontSize: '20px' }}>🚚</span>
            <div style={{ fontWeight: '600' }}>Box Truck</div>
            <div style={{ fontSize: '12px', color: '#666' }}>Local delivery</div>
          </button>
          
          <button 
            className={`method-btn ${method === 'Pickup' ? 'active' : ''}`}
            onClick={() => handleMethodChange('Pickup')}
            style={{ padding: '12px', borderRadius: '8px', border: '2px solid #ccc', cursor: 'pointer', textAlign: 'left' }}
          >
            <span style={{ fontSize: '20px' }}>🏪</span>
            <div style={{ fontWeight: '600' }}>Pickup</div>
            <div style={{ fontSize: '12px', color: '#666' }}>Customer picks up</div>
          </button>
          
          <button 
            className={`method-btn ${method === 'LiDelivery' ? 'active' : ''}`}
            onClick={() => handleMethodChange('LiDelivery')}
            style={{ padding: '12px', borderRadius: '8px', border: '2px solid #ccc', cursor: 'pointer', textAlign: 'left' }}
          >
            <span style={{ fontSize: '20px' }}>🚐</span>
            <div style={{ fontWeight: '600' }}>Li Delivery</div>
            <div style={{ fontSize: '12px', color: '#666' }}>Li handles shipping</div>
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
        <div className="manager-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <button className="btn btn-back" onClick={() => setView('select')} style={{ padding: '6px 12px' }}>← Change Method</button>
          <span style={{ fontWeight: '600' }}>LTL (RL Carriers)</span>
        </div>
        
        <RLQuoteHelper 
          shipmentId={shipment.shipment_id}
          data={rlData}
          onClose={onClose}
          onSave={handleSave}
          onOpenRL={() => openNewWindow('https://www.rlcarriers.com/freight/shipping/rate-quote')}
        />
      </div>
    )
  }
  
  // === PIRATESHIP VIEW ===
  if (view === 'pirateship') {
    return (
      <div className="shipping-manager">
        <div className="manager-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <button className="btn btn-back" onClick={() => setView('select')} style={{ padding: '6px 12px' }}>← Change Method</button>
          <span style={{ fontWeight: '600' }}>Pirateship</span>
        </div>
        
        <div className="pirateship-helper">
          <h3 style={{ marginBottom: '12px' }}>Pirateship - Copy Address</h3>

          <CustomerAddress
            destination={customerInfo}
            title="Ship To"
          />

          <div style={{ marginTop: '16px', marginBottom: '16px' }}>
            <button
              onClick={() => openNewWindow('https://ship.pirateship.com/ship/single')}
              style={{ 
                backgroundColor: '#2196f3', 
                color: 'white', 
                border: 'none', 
                padding: '10px 20px', 
                borderRadius: '6px', 
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px'
              }}
            >
              Open Pirateship →
            </button>
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>Shipping Cost ($):</label>
            <input 
              type="number"
              step="0.01"
              value={psQuotePrice}
              onChange={(e) => setPsQuotePrice(e.target.value)}
              placeholder="0.00"
              disabled={psSaved}
              style={inputStyle}
            />
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>Quote URL (from Pirateship):</label>
            <input 
              type="text"
              value={psQuoteUrl}
              onChange={(e) => setPsQuoteUrl(e.target.value)}
              placeholder="https://ship.pirateship.com/..."
              disabled={psSaved}
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            {psSaved ? (
              <>
                <button onClick={openPirateshipQuote} style={{ backgroundColor: '#4caf50', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}>
                  Open Quote
                </button>
                <button onClick={handleChangePsUrl} style={{ backgroundColor: '#9e9e9e', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}>
                  Change URL
                </button>
                <button onClick={handleSave} style={{ backgroundColor: '#9e9e9e', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}>
                  Done
                </button>
              </>
            ) : (
              <>
                <button onClick={savePirateshipQuote} style={{ backgroundColor: '#4caf50', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}>
                  Save Quote
                </button>
                <button onClick={handleSave} style={{ backgroundColor: '#9e9e9e', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}>
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
        <div className="manager-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <button className="btn btn-back" onClick={() => setView('select')} style={{ padding: '6px 12px' }}>← Change Method</button>
          <span style={{ fontWeight: '600' }}>Li Delivery</span>
        </div>
        
        <div className="li-delivery-helper" style={{ width: '100%' }}>
          <h3 style={{ marginBottom: '8px' }}>Li Delivery Pricing</h3>
          <p style={{ color: '#666', fontSize: '13px', marginBottom: '16px' }}>Li handles delivery. Enter cost and customer charge for tracking.</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Our Cost ($):</label>
              <input 
                type="number"
                step="0.01"
                value={liCost}
                onChange={(e) => setLiCost(e.target.value)}
                placeholder="200.00"
                style={inputStyle}
              />
            </div>
            
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Customer Charge ($):</label>
              <input 
                type="number"
                step="0.01"
                value={liCharge}
                onChange={(e) => setLiCharge(e.target.value)}
                placeholder="250.00"
                style={inputStyle}
              />
            </div>
          </div>
          
          {liCost && liCharge && (
            <p style={{ color: '#2e7d32', fontWeight: '600', marginTop: '8px' }}>
              Profit: ${(parseFloat(liCharge || 0) - parseFloat(liCost || 0)).toFixed(2)}
            </p>
          )}
          
          <button onClick={saveLiPricing} style={{ backgroundColor: '#4caf50', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', marginTop: '16px', fontWeight: '600' }}>
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
        <div className="manager-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <button className="btn btn-back" onClick={() => setView('select')} style={{ padding: '6px 12px' }}>← Change Method</button>
          <span style={{ fontWeight: '600' }}>Box Truck</span>
        </div>
        
        <div className="boxtruck-helper" style={{ width: '100%' }}>
          <h3 style={{ marginBottom: '8px' }}>Box Truck Pricing</h3>
          <p style={{ color: '#666', fontSize: '13px', marginBottom: '16px' }}>Local delivery via box truck.</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Our Cost ($):</label>
              <input 
                type="number"
                step="0.01"
                value={btCost}
                onChange={(e) => setBtCost(e.target.value)}
                placeholder="0.00"
                style={inputStyle}
              />
            </div>
            
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Customer Charge ($):</label>
              <input 
                type="number"
                step="0.01"
                value={btCharge}
                onChange={(e) => setBtCharge(e.target.value)}
                placeholder="0.00"
                style={inputStyle}
              />
            </div>
          </div>
          
          {btCost && btCharge && (
            <p style={{ color: '#2e7d32', fontWeight: '600', marginTop: '8px' }}>
              Profit: ${(parseFloat(btCharge || 0) - parseFloat(btCost || 0)).toFixed(2)}
            </p>
          )}
          
          <button onClick={saveBoxTruckPricing} style={{ backgroundColor: '#4caf50', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', marginTop: '16px', fontWeight: '600' }}>
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
        <div className="manager-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <button className="btn btn-back" onClick={() => setView('select')} style={{ padding: '6px 12px' }}>← Change Method</button>
          <span style={{ fontWeight: '600' }}>{method}</span>
        </div>
        
        <div className="tracking-simple">
          {method === 'Pickup' && (
            <p style={{ color: '#666', marginBottom: '16px' }}>Customer will pick up from warehouse. Mark as complete when picked up.</p>
          )}
          
          <button onClick={handleSave} style={{ backgroundColor: '#4caf50', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
            Done
          </button>
        </div>
      </div>
    )
  }
  
  return null
}

export default ShippingManager
