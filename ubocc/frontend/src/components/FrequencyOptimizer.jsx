import { useState, useEffect } from 'react'
import { fetchRoutes, fetchDepots, fetchDispatch, runAIOptimize, approveDispatch, rejectDispatch } from '../api'

const ROUTE_COLORS = {
  R001: '#EF4444', R002: '#3B82F6', R003: '#22C55E', R004: '#F59E0B',
  R005: '#A855F7', R006: '#06B6D4', R007: '#F97316', R008: '#EC4899',
  R009: '#84CC16', R010: '#14B8A6',
}

const CONDITIONS = [
  'Normal Operations',
  'IPL Match Day (CSK vs MI — Chepauk 37,505 crowd)',
  'Heavy Rain (Northeast Monsoon)',
  'Road Closure (Anna Salai)',
  'Metro Work (Koyambedu)',
  'Peak Hour + Rain Combined',
]

const TIME_OPTIONS = ['Morning Peak (6:00–10:00)', 'Evening Peak (16:00–20:00)', 'Off-Peak (10:00–16:00)', 'Night (20:00–06:00)']

const URGENCY_COLORS = { low: '#22C55E', medium: '#F59E0B', high: '#F97316', critical: '#EF4444' }

function Badge({ text, color }) {
  return (
    <span style={{
      padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700,
      background: `${color}22`, color, border: `1px solid ${color}44`,
      textTransform: 'uppercase', letterSpacing: '1px'
    }}>{text}</span>
  )
}

export default function FrequencyOptimizer() {
  const [routes, setRoutes] = useState([])
  const [depots, setDepots] = useState([])
  const [dispatch, setDispatch] = useState([])
  const [selectedRoute, setSelectedRoute] = useState('R001')
  const [headway, setHeadway] = useState(10)
  const [demand, setDemand] = useState(7)
  const [condition, setCondition] = useState('Normal Operations')
  const [timeOfDay, setTimeOfDay] = useState('Evening Peak (16:00–20:00)')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [approvalState, setApprovalState] = useState(null) // null | 'approving' | 'approved' | 'rejected'
  const [approvedData, setApprovedData] = useState(null)
  const [actionId, setActionId] = useState(null)

  useEffect(() => {
    Promise.all([fetchRoutes(), fetchDepots(), fetchDispatch()]).then(([r, d, disp]) => {
      setRoutes(r.data)
      setDepots(d.data)
      setDispatch(disp.data)
    })
  }, [])

  const currentRoute = routes.find(r => r.route_id === selectedRoute)
  const currentDepot = depots.find(d => d.depot_id === currentRoute?.depot_id)

  useEffect(() => {
    if (currentRoute) {
      setHeadway(currentRoute.peak_headway_min || 10)
    }
  }, [selectedRoute, currentRoute])

  const handleOptimize = async () => {
    setLoading(true)
    setResult(null)
    setError(null)
    setApprovalState(null)
    setApprovedData(null)
    try {
      const res = await runAIOptimize({
        route_id: selectedRoute,
        current_headway: headway,
        demand_score: demand,
        condition,
        time_of_day: timeOfDay,
      })
      setResult(res.data)
      setActionId(res.data.action_id)
    } catch (e) {
      setError('Failed to connect to AI engine. Check backend.')
    }
    setLoading(false)
  }

  const handleApprove = async () => {
    if (!actionId) return
    setApprovalState('approving')
    try {
      const res = await approveDispatch(actionId)
      setApprovedData(res.data)
      setApprovalState('approved')
      const dispRes = await fetchDispatch()
      setDispatch(dispRes.data)
    } catch (e) {
      setApprovalState(null)
    }
  }

  const handleReject = async () => {
    if (!actionId) return
    setApprovalState('rejected')
    try {
      await rejectDispatch(actionId)
      const dispRes = await fetchDispatch()
      setDispatch(dispRes.data)
    } catch (e) {}
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        background: '#0f1929', borderBottom: '1px solid #1e3a5f',
        padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0
      }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#E2E8F0' }}>🤖 AI FREQUENCY OPTIMIZER</div>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: '10px', color: '#64748B' }}>Powered by Gemini 1.5 Flash</span>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22C55E' }} />
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Input panel */}
        <div style={{ width: '320px', minWidth: '320px', borderRight: '1px solid #1e3a5f',
          overflowY: 'auto', padding: '16px', background: '#0a0f1e' }}>

          <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase',
            letterSpacing: '1px', marginBottom: '12px' }}>Optimization Parameters</div>

          {/* Route selector */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '10px', color: '#94A3B8', marginBottom: '5px', textTransform: 'uppercase' }}>Route</label>
            <select value={selectedRoute} onChange={e => setSelectedRoute(e.target.value)}
              style={{
                width: '100%', background: '#1E293B', border: '1px solid #334155',
                color: '#E2E8F0', borderRadius: '6px', padding: '8px 10px',
                fontSize: '12px', cursor: 'pointer',
              }}>
              {routes.map(r => (
                <option key={r.route_id} value={r.route_id}>
                  {r.route_no} — {r.origin.split(' ').slice(0,2).join(' ')} → {r.destination.split(' ').slice(0,2).join(' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Route info box */}
          {currentRoute && (
            <div style={{
              background: '#1E293B', border: `1px solid ${ROUTE_COLORS[selectedRoute] || '#334155'}44`,
              borderLeft: `3px solid ${ROUTE_COLORS[selectedRoute] || '#60A5FA'}`,
              borderRadius: '6px', padding: '8px 10px', marginBottom: '14px'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#E2E8F0', marginBottom: '4px' }}>{currentRoute.route_name}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                {[
                  ['Depot', currentRoute.depot_id],
                  ['Distance', `${currentRoute.distance_km} km`],
                  ['Peak HW', `${currentRoute.peak_headway_min} min`],
                  ['Daily Pax', currentRoute.daily_passengers_avg?.toLocaleString()],
                ].map(([k, v]) => (
                  <div key={k} style={{ fontSize: '10px' }}>
                    <span style={{ color: '#64748B' }}>{k}: </span>
                    <span style={{ color: '#94A3B8', fontFamily: 'JetBrains Mono, monospace' }}>{v}</span>
                  </div>
                ))}
              </div>
              {currentDepot && (
                <div style={{ marginTop: '4px', fontSize: '10px', color: '#F59E0B' }}>
                  Spare buses: {currentDepot.spare_buses} at {currentDepot.depot_name}
                </div>
              )}
            </div>
          )}

          {/* Headway */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94A3B8', marginBottom: '5px', textTransform: 'uppercase' }}>
              <span>Current Headway</span>
              <span style={{ color: '#F59E0B', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>{headway} min</span>
            </label>
            <input type="number" min="3" max="60" value={headway} onChange={e => setHeadway(+e.target.value)}
              style={{
                width: '100%', background: '#1E293B', border: '1px solid #334155',
                color: '#E2E8F0', borderRadius: '6px', padding: '8px 10px', fontSize: '12px'
              }} />
          </div>

          {/* Demand slider */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94A3B8', marginBottom: '5px', textTransform: 'uppercase' }}>
              <span>Passenger Demand</span>
              <span style={{
                color: demand >= 8 ? '#EF4444' : demand >= 6 ? '#F97316' : '#22C55E',
                fontFamily: 'JetBrains Mono, monospace', fontWeight: 700
              }}>{demand}/10</span>
            </label>
            <input type="range" min="1" max="10" value={demand} onChange={e => setDemand(+e.target.value)}
              style={{ width: '100%', cursor: 'pointer', accentColor: demand >= 8 ? '#EF4444' : '#F59E0B' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#475569', marginTop: '3px' }}>
              <span>Low</span><span>Normal</span><span>Critical</span>
            </div>
          </div>

          {/* Condition */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '10px', color: '#94A3B8', marginBottom: '5px', textTransform: 'uppercase' }}>Active Condition</label>
            <select value={condition} onChange={e => setCondition(e.target.value)}
              style={{
                width: '100%', background: '#1E293B', border: '1px solid #334155',
                color: '#E2E8F0', borderRadius: '6px', padding: '8px 10px', fontSize: '11px', cursor: 'pointer'
              }}>
              {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Time of day */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '10px', color: '#94A3B8', marginBottom: '5px', textTransform: 'uppercase' }}>Time of Day</label>
            <select value={timeOfDay} onChange={e => setTimeOfDay(e.target.value)}
              style={{
                width: '100%', background: '#1E293B', border: '1px solid #334155',
                color: '#E2E8F0', borderRadius: '6px', padding: '8px 10px', fontSize: '12px', cursor: 'pointer'
              }}>
              {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Optimize button */}
          <button onClick={handleOptimize} disabled={loading}
            style={{
              width: '100%', padding: '12px', borderRadius: '8px',
              background: loading ? '#334155' : 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
              color: loading ? '#64748B' : '#0B1120',
              border: 'none', fontSize: '12px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              letterSpacing: '0.5px', boxShadow: loading ? 'none' : '0 0 20px rgba(245,158,11,0.4)',
              animation: loading ? 'none' : 'blink 2s ease infinite',
              transition: 'all 0.2s'
            }}>
            {loading ? '⏳ Consulting AI...' : '⚡ RUN AI OPTIMIZATION'}
          </button>
        </div>

        {/* Output panel */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', background: '#0B1120' }}>
          {loading && (
            <div style={{
              background: '#1E293B', border: '1px solid #334155', borderRadius: '8px',
              padding: '40px', textAlign: 'center'
            }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🤖</div>
              <div style={{ color: '#60A5FA', fontSize: '14px', fontWeight: 600 }}>Consulting MTC Operations AI...</div>
              <div style={{ color: '#475569', fontSize: '11px', marginTop: '6px' }}>
                Analyzing route data, congestion patterns, and depot capacity
              </div>
              <div style={{ marginTop: '16px', display: 'flex', gap: '6px', justifyContent: 'center' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: '8px', height: '8px', borderRadius: '50%', background: '#3B82F6',
                    animation: `blink 1.2s ease ${i * 0.2}s infinite`
                  }} />
                ))}
              </div>
            </div>
          )}

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '16px', color: '#F87171', fontSize: '12px' }}>
              ❌ {error}
            </div>
          )}

          {result && !loading && (
            <div style={{ animation: 'slide-in-up 0.4s ease-out' }}>
              {/* Main result card */}
              <div style={{
                background: '#1E293B', border: '1px solid #334155', borderRadius: '8px',
                padding: '20px', marginBottom: '12px',
                boxShadow: '0 0 30px rgba(59,130,246,0.1)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#60A5FA' }}>🤖 AI OPTIMIZATION RESULT</div>
                  <Badge text={result.urgency || 'medium'} color={URGENCY_COLORS[result.urgency] || '#F59E0B'} />
                </div>

                {/* Key metrics row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ background: '#0B1120', borderRadius: '6px', padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '9px', color: '#64748B', textTransform: 'uppercase', marginBottom: '4px' }}>Recommended Headway</div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#22C55E', fontFamily: 'JetBrains Mono, monospace' }}>
                      {result.recommended_headway_min}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>minutes</div>
                    <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '4px' }}>
                      was: <span style={{ color: '#F97316', fontFamily: 'JetBrains Mono, monospace' }}>{headway} min</span>
                    </div>
                  </div>
                  <div style={{ background: '#0B1120', borderRadius: '6px', padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '9px', color: '#64748B', textTransform: 'uppercase', marginBottom: '4px' }}>Extra Buses Needed</div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#F59E0B', fontFamily: 'JetBrains Mono, monospace' }}>
                      +{result.extra_buses_needed}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>buses</div>
                    <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '4px' }}>
                      from {result.route?.depot_id} depot
                    </div>
                  </div>
                  <div style={{ background: '#0B1120', borderRadius: '6px', padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '9px', color: '#64748B', textTransform: 'uppercase', marginBottom: '4px' }}>Confidence Score</div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#A855F7', fontFamily: 'JetBrains Mono, monospace' }}>
                      {Math.round((result.confidence_score || 0.87) * 100)}%
                    </div>
                    <div style={{ height: '4px', background: '#1e3a5f', borderRadius: '2px', marginTop: '8px' }}>
                      <div style={{
                        height: '100%', width: `${Math.round((result.confidence_score || 0.87) * 100)}%`,
                        background: '#A855F7', borderRadius: '2px'
                      }} />
                    </div>
                  </div>
                </div>

                {/* Reasoning */}
                <div style={{ background: '#0B1120', borderRadius: '6px', padding: '12px', marginBottom: '12px' }}>
                  <div style={{ fontSize: '10px', color: '#60A5FA', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' }}>AI Reasoning</div>
                  <div style={{ fontSize: '12px', color: '#CBD5E1', lineHeight: '1.6' }}>{result.reasoning}</div>
                </div>

                {/* Passenger impact + depot instruction */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '6px', padding: '10px' }}>
                    <div style={{ fontSize: '9px', color: '#22C55E', textTransform: 'uppercase', marginBottom: '4px' }}>👥 Passenger Impact</div>
                    <div style={{ fontSize: '11px', color: '#94A3B8' }}>{result.passenger_impact}</div>
                  </div>
                  <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '6px', padding: '10px' }}>
                    <div style={{ fontSize: '9px', color: '#F59E0B', textTransform: 'uppercase', marginBottom: '4px' }}>🏭 Depot Instruction</div>
                    <div style={{ fontSize: '11px', color: '#94A3B8' }}>{result.depot_instruction}</div>
                  </div>
                </div>

                {/* Hold buses */}
                {result.hold_buses?.length > 0 && (
                  <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', padding: '10px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '9px', color: '#EF4444', textTransform: 'uppercase', marginBottom: '6px' }}>⏸ Buses to Hold at Intermediate Stops</div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {result.hold_buses.map(b => (
                        <span key={b} style={{ padding: '3px 8px', background: 'rgba(239,68,68,0.15)', color: '#F87171', borderRadius: '4px', fontSize: '11px', fontFamily: 'JetBrains Mono, monospace' }}>{b}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Approval workflow - only show if not yet approved/rejected */}
              {!approvalState && (
                <div style={{
                  background: '#1E293B', border: '2px solid #F59E0B', borderRadius: '8px',
                  padding: '16px', marginBottom: '12px',
                  boxShadow: '0 0 20px rgba(245,158,11,0.2)'
                }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#FCD34D', marginBottom: '4px' }}>OFFICER APPROVAL REQUIRED</div>
                  <div style={{ fontSize: '10px', color: '#94A3B8', marginBottom: '12px' }}>
                    Officer: Karthik Kumar, Zone Control | Action ID: {actionId}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={handleApprove}
                      style={{
                        flex: 2, padding: '10px', background: 'rgba(34,197,94,0.15)',
                        border: '1px solid rgba(34,197,94,0.4)', borderRadius: '6px',
                        color: '#4ADE80', fontSize: '12px', fontWeight: 700, cursor: 'pointer'
                      }}>
                      ✓ APPROVE & DISPATCH
                    </button>
                    <button onClick={handleReject}
                      style={{
                        flex: 1, padding: '10px', background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px',
                        color: '#F87171', fontSize: '12px', fontWeight: 700, cursor: 'pointer'
                      }}>
                      ✗ REJECT
                    </button>
                    <button style={{
                      flex: 1, padding: '10px', background: 'rgba(59,130,246,0.1)',
                      border: '1px solid rgba(59,130,246,0.3)', borderRadius: '6px',
                      color: '#60A5FA', fontSize: '12px', fontWeight: 700, cursor: 'pointer'
                    }}>✎ MODIFY</button>
                  </div>
                </div>
              )}

              {approvalState === 'approving' && (
                <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '8px', padding: '16px', marginBottom: '12px' }}>
                  <div style={{ color: '#4ADE80', fontSize: '12px' }}>⏳ Processing approval...</div>
                </div>
              )}

              {approvalState === 'approved' && approvedData && (
                <div style={{
                  animation: 'slide-in-up 0.4s ease-out',
                  background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '8px',
                  padding: '16px', marginBottom: '12px',
                  boxShadow: '0 0 20px rgba(34,197,94,0.2)'
                }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#4ADE80', marginBottom: '12px' }}>
                    ✅ APPROVED & DISPATCHED
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                    <div style={{ background: '#0B1120', borderRadius: '6px', padding: '10px' }}>
                      <div style={{ fontSize: '9px', color: '#64748B', textTransform: 'uppercase', marginBottom: '4px' }}>🏭 Depot Notified</div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#F59E0B', fontFamily: 'JetBrains Mono, monospace' }}>{approvedData.depot}</div>
                      <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px' }}>Buses deployed: {approvedData.buses_dispatched}</div>
                    </div>
                    <div style={{ background: '#0B1120', borderRadius: '6px', padding: '10px' }}>
                      <div style={{ fontSize: '9px', color: '#64748B', textTransform: 'uppercase', marginBottom: '4px' }}>⏰ Approved At</div>
                      <div style={{ fontSize: '11px', color: '#60A5FA', fontFamily: 'JetBrains Mono, monospace' }}>
                        {new Date(approvedData.timestamp).toLocaleTimeString('en-IN')}
                      </div>
                    </div>
                  </div>
                  <div style={{ background: '#0B1120', borderRadius: '6px', padding: '10px' }}>
                    <div style={{ fontSize: '9px', color: '#64748B', textTransform: 'uppercase', marginBottom: '4px' }}>📱 Driver SMS Alert</div>
                    <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#4ADE80', background: '#0f1929', padding: '8px', borderRadius: '4px', lineHeight: '1.6' }}>
                      To: Driver — Route {currentRoute?.route_no}<br />
                      {approvedData.driver_alert}<br />
                      Please acknowledge.
                    </div>
                  </div>
                </div>
              )}

              {approvalState === 'rejected' && (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '16px', marginBottom: '12px' }}>
                  <div style={{ color: '#F87171', fontSize: '12px' }}>✗ Recommendation rejected by Karthik Kumar</div>
                </div>
              )}
            </div>
          )}

          {!result && !loading && !error && (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>🤖</div>
              <div style={{ color: '#475569', fontSize: '13px', marginBottom: '8px' }}>Select route and parameters</div>
              <div style={{ color: '#334155', fontSize: '11px' }}>Click "Run AI Optimization" to get Gemini recommendations</div>
            </div>
          )}

          {/* Dispatch History */}
          <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '12px' }}>
              📋 Dispatch History
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155' }}>
                    {['Action ID', 'Time', 'Trigger', 'Route', 'Depot', 'Buses', 'Status'].map(h => (
                      <th key={h} style={{ padding: '6px 8px', textAlign: 'left', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', fontSize: '9px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dispatch.map(d => (
                    <tr key={d.action_id} style={{ borderBottom: '1px solid #1e3a5f' }}>
                      <td style={{ padding: '6px 8px', color: '#60A5FA', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px' }}>{d.action_id}</td>
                      <td style={{ padding: '6px 8px', color: '#94A3B8' }}>{d.timestamp?.slice(11, 16)}</td>
                      <td style={{ padding: '6px 8px', color: '#94A3B8', maxWidth: '150px' }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.trigger_description}</div>
                      </td>
                      <td style={{ padding: '6px 8px', color: '#F59E0B', fontFamily: 'JetBrains Mono, monospace' }}>{d.route_id}</td>
                      <td style={{ padding: '6px 8px', color: '#94A3B8' }}>{d.depot_assigned}</td>
                      <td style={{ padding: '6px 8px', color: '#E2E8F0', textAlign: 'center', fontFamily: 'JetBrains Mono, monospace' }}>{d.buses_dispatched}/{d.buses_requested}</td>
                      <td style={{ padding: '6px 8px' }}>
                        <span style={{
                          padding: '2px 6px', borderRadius: '3px', fontSize: '9px', fontWeight: 700,
                          background: d.status === 'approved' ? 'rgba(34,197,94,0.15)' : d.status === 'rejected' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                          color: d.status === 'approved' ? '#4ADE80' : d.status === 'rejected' ? '#F87171' : '#FCD34D'
                        }}>{d.status?.toUpperCase()}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
