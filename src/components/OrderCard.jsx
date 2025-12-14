const handleStatusChange = async (e) => {
  e.stopPropagation()
  const newStatus = e.target.value
  if (newStatus === order.current_status) return

  setIsUpdating(true)

  try {
    const statusFieldMap = {
      needs_payment_link: { payment_link_sent: false, payment_received: false },
      awaiting_payment: { payment_link_sent: true, payment_received: false },
      needs_warehouse_order: { payment_received: true, sent_to_warehouse: false },
      awaiting_warehouse: { sent_to_warehouse: true, warehouse_confirmed: false },
      needs_bol: { warehouse_confirmed: true, bol_sent: false },
      awaiting_shipment: { bol_sent: true, is_complete: false },
      complete: { is_complete: true }
    }

    const updates = statusFieldMap[newStatus]
    if (!updates) {
      throw new Error(`Unknown status: ${newStatus}`)
    }

    const res = await fetch(`${API_URL}/orders/${order.order_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    })

    if (!res.ok) {
      const msg = await res.text()
      throw new Error(`PATCH failed ${res.status}: ${msg}`)
    }

    if (onUpdate) onUpdate()
  } catch (err) {
    console.error('Status update failed:', err)
    alert('Status update failed. Check console.')
  } finally {
    setIsUpdating(false)
  }
}
