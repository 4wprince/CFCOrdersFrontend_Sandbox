/**
 * RLQuoteHelper.jsx
 * Complete RL Carriers quote and BOL helper
 * v5.8.4 - Opens RL in new tab via prop, quote URL save
 */

import { useState } from 'react'
import { CustomerAddress, BillToAddress, CopyButton } from './CustomerAddress'

import { API_URL } from '../config'

const RLQuoteHelper = ({ shipmentId, data, onClose, onSave, onOpenRL }) => {
  const [quoteNumber, setQuoteNumber] = useState(data.existing_quote?.quote_number || '')
  const [quotePrice, setQuotePrice] = useState(data.existing_quote?.quote_price || '')
  const [quoteUrl, setQuoteUrl] = useState(data.existing_quote?.quote_url || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(!!data.existing_quote?.quote_url)
  
  // Calculate customer price (+$50 markup)
  const customerPrice = quotePrice ? (parseFloat(quotePrice) + 50).toFixed(2) : null
  
  // Combined emails for RL notification field
  const combinedEmails = data.destination?.email 
    ? `${data.destination.email}, cabinetsforcontractors@gmail.com`
    : 'cabinetsforcontractors@gmail.com'
  
  const handleSave = async () => {
    setSaving(true)
    try {
      const params = new URLSearchParams()
      if (quoteNumber) params.append('rl_quote_number', quoteNumber)
      if (quotePrice) params.append('rl_quote_price', quotePrice)
      if (customerPrice) params.append('rl_customer_price', customerPrice)
      if (quoteUrl) params.append('quote_url', quoteUrl)
      
      await fetch(`${API_URL}/shipments/${shipmentId}?${params.toString()}`, {
        method: 'PATCH'
      })
      
      setSaved(true)
      if (onSave) onSave()
    } catch (err) {
      console.error('Failed to save RL quote:', err)
      alert('Failed to save quote. Please try again.')
    }
    setSaving(false)
  }
  
  const openRLSite = () => {
    if (onOpenRL) {
      onOpenRL()
    } else {
      window.open('https://www.rlcarriers.com/freight/shipping/rate-quote', '_blank')
    }
  }
  
  const openSavedQuote = () => {
    if (quoteUrl) {
      const w = 800
      const h = window.screen.height
      const left = window.screen.width - w
      window.open(quoteUrl, 'ShippingQuote', `width=${w},height=${h},left=${left},top=0,resizable=yes,scrollbars=yes`)
    }
  }
  
  const handleChangeUrl = () => {
    setSaved(false)
  }
  
  return (
    <div className="rl-helper">
      {/* Section 1: Quote Info */}
      <div className="rl-section quote-info">
        <h3>Quote Information</h3>
        
        <div className="info-grid">
          <CopyButton label="Origin ZIP" text={data.origin_zip} />
          <CopyButton label="Dest ZIP" text={data.destination?.zip} />
          
          <div className="copy-row">
            <span className="copy-label">Weight:</span>
            {data.weight?.value ? (
              <>
                <span className="copy-value"><strong>{data.weight.value} lbs</strong></span>
                <button className="copy-btn" onClick={() => navigator.clipboard.writeText(String(data.weight.value))}>📋</button>
                <span className="note">({data.weight.note})</span>
              </>
            ) : (
              <span className="warning">⚠️ {data.weight?.note || 'Enter weight manually'}</span>
            )}
          </div>
          
          <div className="copy-row">
            <span className="copy-label">Class:</span>
            <span className="copy-value"><strong>85</strong> (always)</span>
          </div>
          
          <CopyButton label="Commodity" text="RTA Cabinetry" />
        </div>
        
        {data.oversized?.detected && (
          <div className="oversized-warning">
            <strong>⚠️ Oversized Items - Check "Dimensions" box!</strong>
            <ul>
              {data.oversized.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        )}
        
        <button className="btn btn-primary" onClick={openRLSite}>
          Open RL Quote Page →
        </button>
      </div>
      
      {/* Section 2: Enter Quote Results */}
      <div className="rl-section quote-entry">
        <h3>Enter Quote Results</h3>
        
        <div className="input-grid">
          <div className="input-group">
            <label>Quote Number:</label>
            <input 
              type="text"
              value={quoteNumber}
              onChange={(e) => setQuoteNumber(e.target.value)}
              placeholder="e.g., 9680088"
            />
          </div>
          
          <div className="input-group">
            <label>Quote Price ($):</label>
            <input 
              type="number"
              step="0.01"
              value={quotePrice}
              onChange={(e) => setQuotePrice(e.target.value)}
              placeholder="e.g., 179.38"
            />
          </div>
          
          <div className="input-group">
            <label>Customer Price (+$50):</label>
            <input 
              type="text"
              readOnly
              value={customerPrice ? `$${customerPrice}` : 'Auto-calculated'}
              className="calculated"
            />
          </div>
        </div>
        
        <div className="input-group full-width">
          <label>Quote URL (from Recent Activity):</label>
          <div className="url-input-row">
            <input 
              type="text"
              value={quoteUrl}
              onChange={(e) => setQuoteUrl(e.target.value)}
              placeholder="https://www.rlcarriers.com/freight/shipping/rate-quote?id=..."
              disabled={saved}
            />
          </div>
        </div>
        
        <div className="button-row">
          {saved ? (
            <>
              <button 
                className="btn btn-success" 
                onClick={openSavedQuote}
              >
                Open Quote
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={handleChangeUrl}
              >
                Change URL
              </button>
            </>
          ) : (
            <button 
              className="btn btn-success" 
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Quote'}
            </button>
          )}
        </div>
      </div>
      
      {/* Section 3: BOL Helper - Customer Address */}
      <div className="rl-section bol-helper">
        <h3>BOL Helper - Copy for RL Form</h3>
        
        <div className="address-section">
          <h4>Ship To (Customer)</h4>
          <CopyButton label="Company/Name" text={data.destination?.name} />
          <CopyButton label="Street" text={data.destination?.street} />
          <CopyButton label="City" text={data.destination?.city} />
          <CopyButton label="State" text={data.destination?.state} />
          <CopyButton label="ZIP" text={data.destination?.zip} />
          <CopyButton label="Phone" text={data.destination?.phone} />
          <CopyButton label="Email" text={data.destination?.email} />
        </div>
        
        <BillToAddress />
        
        <div className="address-section">
          <h4>Email Notifications</h4>
          <CopyButton label="Both Emails" text={combinedEmails} />
        </div>
      </div>
    </div>
  )
}

export default RLQuoteHelper
