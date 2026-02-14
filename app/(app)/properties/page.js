'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { ALLOCATION_METHODS } from '@/lib/calculations'
import { PLANS } from '@/lib/plans'
import { useToast, useConfirm } from '@/app/components/Toast'

export default function Properties() {
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingProp, setEditingProp] = useState(null)
  const [expandedProp, setExpandedProp] = useState(null)
  const [unitForm, setUnitForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [userPlan, setUserPlan] = useState('free')
  const supabase = createClient()
  const toast = useToast()
  const confirm = useConfirm()

  const emptyProp = { name: '', address: '', city: '', state: '', zip: '', property_type: 'residential', default_allocation_method: 'sqft', sqft_weight: 70, total_sqft: '', common_area_sqft: '0', notes: '' }
  const emptyUnit = { unit_number: '', sqft: '', bedrooms: 1, occupants: 1, tenant_name: '', tenant_email: '', tenant_phone: '', lease_start: '', lease_end: '', is_vacant: false, notes: '' }

  const [form, setForm] = useState(emptyProp)

  useEffect(() => { loadProperties() }, [])

  async function loadProperties() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single()
    if (profile) setUserPlan(profile.plan || 'free')
    const { data, error } = await supabase.from('properties').select('*, units(*)').order('created_at', { ascending: false })
    if (error) console.error('Load properties error:', error)
    setProperties(data || [])
    setLoading(false)
  }

  function handleAddProperty() {
    const plan = PLANS[userPlan] || PLANS.free
    const limit = plan.limits.properties
    if (limit !== -1 && properties.length >= limit) {
      toast?.warning(`Your ${plan.name} plan allows up to ${limit} propert${limit === 1 ? 'y' : 'ies'}. Upgrade your plan to add more.`)
      return
    }
    setForm(emptyProp)
    setEditingProp(null)
    setShowForm(true)
  }

  function handleAddUnit(prop) {
    const plan = PLANS[userPlan] || PLANS.free
    const unitLimit = plan.limits.units_per_property
    const currentUnits = prop.units?.length || 0
    if (unitLimit !== -1 && currentUnits >= unitLimit) {
      toast?.warning(`Your ${plan.name} plan allows up to ${unitLimit} units per property. Upgrade to add more.`)
      return
    }
    setUnitForm({ ...emptyUnit, _propertyId: prop.id })
  }

  async function saveProp(e) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const payload = {
      user_id: user.id, name: form.name, address: form.address || null,
      city: form.city || null, state: form.state || null, zip: form.zip || null,
      property_type: form.property_type, default_allocation_method: form.default_allocation_method,
      sqft_weight: parseInt(form.sqft_weight) || 70, total_sqft: parseFloat(form.total_sqft) || null,
      common_area_sqft: parseFloat(form.common_area_sqft) || 0, notes: form.notes || null,
    }

    if (editingProp) {
      const { error } = await supabase.from('properties').update(payload).eq('id', editingProp.id)
      if (error) { toast?.error('Error: ' + error.message); setSaving(false); return }
      toast?.success('Property updated')
    } else {
      const plan = PLANS[userPlan] || PLANS.free
      const limit = plan.limits.properties
      if (limit !== -1 && properties.length >= limit) {
        toast?.warning(`Plan limit reached. Upgrade to add more properties.`)
        setSaving(false); return
      }
      const { error } = await supabase.from('properties').insert(payload)
      if (error) { toast?.error('Error: ' + error.message); setSaving(false); return }
      toast?.success('Property added')
    }
    setSaving(false)
    setShowForm(false)
    setEditingProp(null)
    setForm(emptyProp)
    loadProperties()
  }

  async function deleteProp(id) {
    const ok = await confirm('This will permanently delete the property and all its units, billing history, and invoices.', {
      title: 'Delete Property',
      confirmText: 'Delete Everything',
      danger: true,
    })
    if (!ok) return
    await supabase.from('properties').delete().eq('id', id)
    if (expandedProp === id) setExpandedProp(null)
    toast?.success('Property deleted')
    loadProperties()
  }

  function editProp(prop) {
    setForm({ name: prop.name || '', address: prop.address || '', city: prop.city || '', state: prop.state || '', zip: prop.zip || '', property_type: prop.property_type, default_allocation_method: prop.default_allocation_method, sqft_weight: prop.sqft_weight || 70, total_sqft: prop.total_sqft || '', common_area_sqft: prop.common_area_sqft || '0', notes: prop.notes || '' })
    setEditingProp(prop)
    setShowForm(true)
  }

  async function saveUnit(e, propertyId) {
    e.preventDefault()
    setSaving(true)
    const rawOccupants = parseInt(unitForm.occupants)
    const occupants = isNaN(rawOccupants) ? 1 : rawOccupants
    const rawBedrooms = parseInt(unitForm.bedrooms)
    const bedrooms = isNaN(rawBedrooms) ? 1 : rawBedrooms
    const is_vacant = unitForm.is_vacant === true ? true : (occupants === 0 && !unitForm.tenant_name?.trim())

    const payload = {
      property_id: propertyId, unit_number: unitForm.unit_number,
      tenant_name: unitForm.tenant_name || null, tenant_email: unitForm.tenant_email || null,
      tenant_phone: unitForm.tenant_phone || null, sqft: parseFloat(unitForm.sqft) || 0,
      bedrooms, occupants, is_vacant,
      lease_start: unitForm.lease_start || null, lease_end: unitForm.lease_end || null,
      notes: unitForm.notes || null,
    }

    let result
    if (unitForm.id) {
      result = await supabase.from('units').update(payload).eq('id', unitForm.id)
    } else {
      result = await supabase.from('units').insert(payload)
    }

    if (result.error) {
      toast?.error('Error saving unit: ' + result.error.message)
    } else {
      toast?.success(unitForm.id ? 'Unit updated' : 'Unit added')
    }
    setSaving(false)
    setUnitForm(null)
    loadProperties()
  }

  async function deleteUnit(id) {
    const ok = await confirm('Delete this unit and its associated data?', {
      title: 'Delete Unit',
      confirmText: 'Delete',
      danger: true,
    })
    if (!ok) return
    await supabase.from('units').delete().eq('id', id)
    toast?.success('Unit deleted')
    loadProperties()
  }

  const PROP_TYPE_LABELS = { residential: 'Residential', commercial: 'Commercial', mixed: 'Mixed Use' }

  if (loading) return null

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Properties</h1>
          <p style={{ color: '#6b7280', fontSize: 14 }}>Manage your buildings and units</p>
        </div>
        <button className="btn btn-primary" onClick={handleAddProperty}>+ Add Property</button>
      </div>

      {showForm && (
        <Modal onClose={() => setShowForm(false)}>
          <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f0eeeb' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>{editingProp ? 'Edit' : 'Add'} Property</h2>
          </div>
          <form onSubmit={saveProp} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="label">Property Name *</label>
              <input className="input" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g., Oakwood Apartments" />
            </div>
            <div>
              <label className="label">Address</label>
              <input className="input" value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="123 Main St" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
              <div><label className="label">City</label><input className="input" value={form.city} onChange={e => setForm({...form, city: e.target.value})} /></div>
              <div><label className="label">State</label><input className="input" value={form.state} onChange={e => setForm({...form, state: e.target.value})} maxLength={2} /></div>
              <div><label className="label">ZIP</label><input className="input" value={form.zip} onChange={e => setForm({...form, zip: e.target.value})} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="label">Property Type</label>
                <select className="input" value={form.property_type} onChange={e => setForm({...form, property_type: e.target.value})}>
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                  <option value="mixed">Mixed Use</option>
                </select>
              </div>
              <div>
                <label className="label">Allocation Method</label>
                <select className="input" value={form.default_allocation_method} onChange={e => setForm({...form, default_allocation_method: e.target.value})}>
                  {Object.entries(ALLOCATION_METHODS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>
            {form.default_allocation_method === 'weighted' && (
              <div>
                <label className="label">Sq Ft Weight: {form.sqft_weight}% / Occupancy: {100 - form.sqft_weight}%</label>
                <input type="range" min={10} max={90} value={form.sqft_weight} onChange={e => setForm({...form, sqft_weight: parseInt(e.target.value)})} style={{ width: '100%', accentColor: '#1a1a2e' }} />
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label className="label">Total Building Sq Ft</label><input className="input input-mono" type="number" value={form.total_sqft} onChange={e => setForm({...form, total_sqft: e.target.value})} /></div>
              <div><label className="label">Common Area Sq Ft</label><input className="input input-mono" type="number" value={form.common_area_sqft} onChange={e => setForm({...form, common_area_sqft: e.target.value})} /></div>
            </div>
            <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">{editingProp ? 'Save Changes' : 'Add Property'}</button>
            </div>
          </form>
        </Modal>
      )}


      {properties.length === 0 ? (
        <div className="card"><div className="empty-state">
          <h3>No properties yet</h3>
          <p>Add your first property to start tracking utility billing</p>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Add Property</button>
        </div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {properties.map(prop => (
            <div key={prop.id} className="card">
              <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setExpandedProp(expandedProp === prop.id ? null : prop.id)}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>{prop.name}</h3>
                    <span className={`badge badge-${prop.property_type === 'commercial' ? 'blue' : prop.property_type === 'mixed' ? 'yellow' : 'green'}`}>{PROP_TYPE_LABELS[prop.property_type] || prop.property_type}</span>
                  </div>
                  {prop.address && <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{prop.address}{prop.city && `, ${prop.city}`}{prop.state && `, ${prop.state}`} {prop.zip}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 13, color: '#6b7280' }}>{prop.units?.length || 0} units</span>
                  <span style={{ color: '#9ca3af', transform: expandedProp === prop.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
                </div>
              </div>

              {expandedProp === prop.id && (
                <div style={{ borderTop: '1px solid #f0eeeb', animation: 'fadeIn 0.15s ease' }}>
                  <div style={{ padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8f7f6' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#4b5563' }}>Units</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => editProp(prop)}>Edit Property</button>
                      <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => handleAddUnit(prop)}>+ Add Unit</button>
                      <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => deleteProp(prop.id)}>Delete</button>
                    </div>
                  </div>

                  {unitForm && unitForm._propertyId === prop.id && (
                    <form onSubmit={e => saveUnit(e, prop.id)} style={{ padding: '16px 24px', background: '#fffdf7', borderBottom: '1px solid #f0eeeb', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, alignItems: 'end' }}>
                      <div><label className="label">Unit # *</label><input className="input" required value={unitForm.unit_number} onChange={e => setUnitForm({...unitForm, unit_number: e.target.value})} placeholder="101" /></div>
                      <div><label className="label">Tenant</label><input className="input" value={unitForm.tenant_name} onChange={e => setUnitForm({...unitForm, tenant_name: e.target.value})} placeholder="Name" /></div>
                      <div><label className="label">Email</label><input className="input" type="email" value={unitForm.tenant_email} onChange={e => setUnitForm({...unitForm, tenant_email: e.target.value})} /></div>
                      <div><label className="label">Sq Ft</label><input className="input input-mono" type="number" value={unitForm.sqft} onChange={e => setUnitForm({...unitForm, sqft: e.target.value})} /></div>
                      <div><label className="label">Beds</label><input className="input input-mono" type="number" value={unitForm.bedrooms} onChange={e => setUnitForm({...unitForm, bedrooms: e.target.value})} min={0} /></div>
                      <div><label className="label">People</label><input className="input input-mono" type="number" value={unitForm.occupants} onChange={e => setUnitForm({...unitForm, occupants: e.target.value})} min={0} /></div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button type="submit" className="btn btn-primary" style={{ padding: '8px 14px', fontSize: 12 }} disabled={saving}>{saving ? '...' : 'Save'}</button>
                        <button type="button" className="btn btn-secondary" style={{ padding: '8px 10px', fontSize: 12 }} onClick={() => setUnitForm(null)}>Cancel</button>
                      </div>
                    </form>
                  )}

                  {prop.units?.length > 0 ? (
                    <table className="table">
                      <thead><tr><th>Unit</th><th>Tenant</th><th>Email</th><th>Sq Ft</th><th>Beds</th><th>People</th><th>Status</th><th></th></tr></thead>
                      <tbody>
                        {prop.units.sort((a, b) => a.unit_number.localeCompare(b.unit_number, undefined, { numeric: true })).map(unit => (
                          <tr key={unit.id} style={{ opacity: unit.is_vacant ? 0.5 : 1 }}>
                            <td style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{unit.unit_number}</td>
                            <td>{unit.tenant_name || '—'}</td>
                            <td style={{ fontSize: 12, color: '#6b7280' }}>{unit.tenant_email || '—'}</td>
                            <td style={{ fontFamily: "'DM Mono', monospace" }}>{unit.sqft?.toLocaleString()}</td>
                            <td style={{ fontFamily: "'DM Mono', monospace" }}>{unit.bedrooms}</td>
                            <td style={{ fontFamily: "'DM Mono', monospace" }}>{unit.occupants}</td>
                            <td><span className={`badge ${unit.is_vacant ? 'badge-yellow' : 'badge-green'}`}>{unit.is_vacant ? 'Vacant' : 'Occupied'}</span></td>
                            <td style={{ textAlign: 'right' }}>
                              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 12, marginRight: 8 }} onClick={() => setUnitForm({ ...unit, _propertyId: prop.id })}>Edit</button>
                              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 12 }} onClick={() => deleteUnit(unit.id)}>Delete</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                      No units yet. <button style={{ background: 'none', border: 'none', color: '#3b5998', cursor: 'pointer', fontWeight: 600 }} onClick={() => handleAddUnit(prop)}>Add your first unit</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  )
}