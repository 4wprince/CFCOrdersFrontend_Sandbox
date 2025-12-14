/**
 * CustomerAddress.jsx
 * Shared component for copying customer address fields
 * v5.9.2 - Click checkbox to copy, shows checkmark when copied
 */

import { useState } from 'react'

const CopyField = ({ text, label }) => {
  const [copied, setCopied] = useState(false)
  
  if (!text) return null
  
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  return (
    <div 
      onClick={handleCopy}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '4px 0',
        cursor: 'pointer',
        borderRadius: '4px'
      }}
      title={`Click to copy ${label}`}
    >
      <span style={{
        width: '18px',
        height: '18px',
        border: copied ? '2px solid #4caf50' : '2px solid #ccc',
        borderRadius: '3px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: copied ? '#e8f5e9' : 'white',
        fontSize: '12px',
        flexShrink: 0
      }}>
        {copied ? '✓' : ''}
      </span>
      <span style={{ fontWeight: '600', minWidth: '80px', color: '#666', fontSize: '12px' }}>{label}:</span>
      <span style={{ color: '#333', fontSize: '13px' }}>{text}</span>
    </div>
  )
}

const CustomerAddress = ({ destination, title = "Ship To (Customer)" }) => {
  const [allCopied, setAllCopied] = useState(false)
  
  if (!destination) return null
  
  // Build full address for copy all
  const buildFullAddress = () => {
    const parts = [
      destination.name,
      destination.street,
      destination.street2,
      `${destination.city || ''}, ${destination.state || ''} ${destination.zip || ''}`.trim(),
      destination.phone,
      destination.email
    ].filter(Boolean)
    return parts.join('\n')
  }
  
  const handleCopyAll = () => {
    navigator.clipboard.writeText(buildFullAddress())
    setAllCopied(true)
    setTimeout(() => setAllCopied(false), 2000)
  }
  
  return (
    <div style={{
      backgroundColor: '#f5f5f5',
      borderRadius: '8px',
      padding: '12px',
      marginBottom: '12px'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '8px'
      }}>
        <h4 style={{ margin: 0, fontSize: '14px' }}>{title}</h4>
        <button
          onClick={handleCopyAll}
          style={{
            backgroundColor: allCopied ? '#4caf50' : '#2196f3',
            color: 'white',
            border: 'none',
            padding: '4px 10px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px'
          }}
        >
          {allCopied ? '✓ Copied All' : 'Copy All'}
        </button>
      </div>
      <CopyField label="Company/Name" text={destination.name} />
      <CopyField label="Street" text={destination.street} />
      {destination.street2 && <CopyField label="Street 2" text={destination.street2} />}
      <CopyField label="City" text={destination.city} />
      <CopyField label="State" text={destination.state} />
      <CopyField label="ZIP" text={destination.zip} />
      <CopyField label="Phone" text={destination.phone} />
      <CopyField label="Email" text={destination.email} />
    </div>
  )
}

// Static billing address for CFC
const BillToAddress = () => {
  const [allCopied, setAllCopied] = useState(false)
  
  const billTo = {
    company: 'Cabinets For Contactors-Cust Number C00VP1',
    street: '185 Stevenson Point',
    city: 'DALLAS',
    state: 'GA',
    zip: '30132',
    email: 'cabinetsforcontractors@gmail.com',
    phone: '(770) 990-4885'
  }
  
  const handleCopyAll = () => {
    const fullAddress = `${billTo.company}\n${billTo.street}\n${billTo.city}, ${billTo.state} ${billTo.zip}\n${billTo.phone}\n${billTo.email}`
    navigator.clipboard.writeText(fullAddress)
    setAllCopied(true)
    setTimeout(() => setAllCopied(false), 2000)
  }
  
  return (
    <div style={{
      backgroundColor: '#fff3e0',
      borderRadius: '8px',
      padding: '12px',
      marginBottom: '12px'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '8px'
      }}>
        <h4 style={{ margin: 0, fontSize: '14px' }}>Bill To (Section 3 - Always Same)</h4>
        <button
          onClick={handleCopyAll}
          style={{
            backgroundColor: allCopied ? '#4caf50' : '#2196f3',
            color: 'white',
            border: 'none',
            padding: '4px 10px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px'
          }}
        >
          {allCopied ? '✓ Copied All' : 'Copy All'}
        </button>
      </div>
      <CopyField label="Company" text={billTo.company} />
      <CopyField label="Street" text={billTo.street} />
      <CopyField label="City" text={billTo.city} />
      <CopyField label="State" text={billTo.state} />
      <CopyField label="ZIP" text={billTo.zip} />
      <CopyField label="Email" text={billTo.email} />
      <CopyField label="Phone" text={billTo.phone} />
    </div>
  )
}

export { CustomerAddress, BillToAddress, CopyField }
export default CustomerAddress
