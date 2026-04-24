import { useState, useEffect } from 'react'

const API = 'http://localhost:8000'

const OCC_LEVELS = {
  low:    { bar: '#22c55e', label: '#4ade80', text: 'Seats available' },
  medium: { bar: '#f59e0b', label: '#fbbf24', text: 'Moderate crowd'  },
  high:   { bar: '#f97316', label: '#fb923c', text: 'Crowded'         },
  full:   { bar: '#ef4444', label: '#f87171', text: 'Very crowded'    },
}

function occLevel(pct) {
  if (pct < 40) return 'low'
  if (pct < 70) return 'medium'
  if (pct < 90) return 'high'
  return 'full'
}

export default function StopArrivalBoard({ stop }) {
  const [arrivals, setArrivals] = useState([])
  const [loading, setLoading]   = useState(true)
  const [lastRefresh, setLast]  = useState(new Date())

  const fetch_ = async () => {
    try {
      const data = await fetch(
        `${API}/api/gps/stops/${encodeURIComponent(stop.name)}/arrivals`
      ).then(r => r.json())
      setArrivals(Array.isArray(data) ? data : [])
    } catch { setArrivals([]) }
    setLoading(false)
    setLast(new Date())
  }

  useEffect(() => {
    fetch_()
    const t = setInterval(fetch_, 15000)
    return () => clearInterval(t)
  }, [stop.name]) // eslint-disable-line

  return (
    <div style={{ background: '#0f172a', color: '#e2e8f0', padding: '16px', minHeight: '260px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#3b82f6' }} />
            <span style={{ fontSize:'10px', color:'#60a5fa', textTransform:'uppercase', letterSpacing:'1.5px' }}>Bus Stop</span>
          </div>
          <h2 style={{ fontSize:'18px', fontWeight:700, margin:'0 0 2px' }}>{stop.name}</h2>
          <p style={{ fontSize:'11px', color:'#64748b', margin:0 }}>
            {stop.routes?.length || 0} routes · {stop.lat?.toFixed(4)}°N
          </p>
        </div>
        <div style={{ textAlign:'right', fontSize:'10px', color:'#64748b' }}>
          <div>Updated</div>
          <div>{lastRefresh.toLocaleTimeString()}</div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:'40px 0', color:'#64748b' }}>⟳ Fetching buses...</div>
      ) : arrivals.length === 0 ? (
        <div style={{ textAlign:'center', padding:'40px 0', color:'#475569' }}>No buses tracked nearby</div>
      ) : (
        <div>
          <div style={{ fontSize:'9px', color:'#475569', textTransform:'uppercase', letterSpacing:'1.5px', marginBottom:'10px' }}>
            Upcoming Arrivals
          </div>
          {arrivals.map((a, i) => {
            const occ = OCC_LEVELS[occLevel(a.occupancy)]
            return (
              <div key={a.bus_id} style={{
                background: i === 0 ? 'rgba(59,130,246,0.06)' : '#111827',
                border: `1px solid ${i===0 ? 'rgba(59,130,246,0.4)' : '#1e293b'}`,
                borderRadius: '12px', padding: '10px 12px', marginBottom: '8px',
              }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                    <div style={{ background:'#eab308', color:'#000', fontWeight:700, fontSize:'12px',
                                  padding:'3px 8px', borderRadius:'6px', minWidth:'40px', textAlign:'center' }}>
                      {a.route_id}
                    </div>
                    <div>
                      <div style={{ fontSize:'10px', color:'#64748b' }}>{a.bus_id}</div>
                      <div style={{ fontSize:'10px', fontWeight:600, color:occ.label }}>{occ.text}</div>
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    {a.eta_min === 0 ? (
                      <div style={{ color:'#22c55e', fontWeight:700 }}>At stop</div>
                    ) : (
                      <>
                        <div style={{ fontWeight:800, fontSize:'24px', lineHeight:1, color: i===0?'#fff':'#94a3b8' }}>
                          {a.eta_min}
                        </div>
                        <div style={{ fontSize:'9px', color:'#475569' }}>min away</div>
                      </>
                    )}
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:'8px', marginTop:'8px' }}>
                  <div style={{ flex:1, background:'#1e293b', borderRadius:'4px', height:'4px' }}>
                    <div style={{ height:'4px', borderRadius:'4px', background:occ.bar,
                                  width:`${Math.min(100,a.occupancy)}%`, transition:'width 0.5s' }} />
                  </div>
                  <span style={{ fontSize:'10px', color:'#64748b' }}>{a.occupancy}%</span>
                </div>
                <div style={{ display:'flex', gap:'12px', marginTop:'4px' }}>
                  <span style={{ fontSize:'10px', color:'#475569' }}>📍 {a.distance_km} km</span>
                  {a.status !== 'normal' && (
                    <span style={{ fontSize:'10px', color:'#f87171' }}>⚠ {a.status}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ marginTop:'12px', paddingTop:'10px', borderTop:'1px solid #1e293b', textAlign:'center' }}>
        <p style={{ fontSize:'10px', color:'#334155', margin:0 }}>
          அடுத்த பேருந்து தகவல் · Next bus information
        </p>
      </div>
    </div>
  )
}
