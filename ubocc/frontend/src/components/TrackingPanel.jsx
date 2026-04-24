import { useState, useEffect } from 'react'

const API = 'http://localhost:8000'

export default function TrackingPanel({ route, onBusSelect }) {
  const [buses, setBuses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const data = await fetch(
          `${API}/api/routes/${route.route_id}/buses`
        ).then(r => r.json())
        setBuses(Array.isArray(data) ? data : [])
      } catch { setBuses([]) }
      setLoading(false)
    }
    fetch_()
    const t = setInterval(fetch_, 5000)
    return () => clearInterval(t)
  }, [route.route_id])

  const STATUS_COLOR = {
    normal:     '#22c55e',
    crowded:    '#f59e0b',
    delayed:    '#ef4444',
    overloaded: '#dc2626',
  }

  return (
    <div style={{ background:'#0f172a', color:'#e2e8f0', padding:'16px', minHeight:'240px' }}>
      {/* Route header */}
      <div style={{ marginBottom:'14px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'6px' }}>
          <div style={{
            background:'#eab308', color:'#000',
            fontWeight:700, fontSize:'16px',
            padding:'4px 12px', borderRadius:'8px',
          }}>{route.route_id}</div>
          <div>
            <div style={{ fontSize:'12px', fontWeight:600 }}>Live Bus Tracking</div>
            <div style={{ fontSize:'10px', color:'#64748b' }}>
              {route.stop_count} stops · {route.gps_coverage_pct}% GPS coverage
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:'40px 0', color:'#64748b' }}>⟳ Loading buses...</div>
      ) : buses.length === 0 ? (
        <div style={{ textAlign:'center', padding:'40px 0', color:'#475569' }}>
          No buses tracked on this route
        </div>
      ) : (
        <div>
          <div style={{ fontSize:'9px', color:'#475569', textTransform:'uppercase', letterSpacing:'1.5px', marginBottom:'10px' }}>
            {buses.length} Buses on Route
          </div>
          {buses.map(bus => (
            <button
              key={bus.bus_id}
              onClick={() => onBusSelect(bus)}
              style={{
                display:'flex', alignItems:'center', gap:'12px',
                width:'100%', padding:'10px 12px', marginBottom:'8px',
                background:'rgba(255,255,255,0.03)', border:'1px solid #1e293b',
                borderRadius:'12px', cursor:'pointer', textAlign:'left',
                transition:'all 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
            >
              {/* Status dot */}
              <div style={{
                width:'10px', height:'10px', borderRadius:'50%', flexShrink:0,
                background: STATUS_COLOR[bus.status] || STATUS_COLOR.normal,
                boxShadow: `0 0 6px ${STATUS_COLOR[bus.status] || STATUS_COLOR.normal}`,
              }} />
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:'12px' }}>{bus.bus_id}</div>
                <div style={{ fontSize:'10px', color:'#64748b' }}>
                  {bus.speed_kmph} km/h · {bus.direction}
                </div>
              </div>
              {/* Occupancy pill */}
              <div style={{
                background: bus.occupancy > 90 ? 'rgba(239,68,68,0.15)' :
                            bus.occupancy > 70 ? 'rgba(245,158,11,0.15)' : 'rgba(34,197,94,0.15)',
                color:      bus.occupancy > 90 ? '#f87171' :
                            bus.occupancy > 70 ? '#fbbf24' : '#4ade80',
                fontSize:'10px', fontWeight:700,
                padding:'3px 8px', borderRadius:'6px',
              }}>{bus.occupancy}%</div>
              {/* Delay badge */}
              {bus.delay_min > 0 && (
                <div style={{
                  background:'rgba(239,68,68,0.15)', color:'#f87171',
                  fontSize:'9px', padding:'2px 6px', borderRadius:'5px',
                }}>+{bus.delay_min}m</div>
              )}
            </button>
          ))}
        </div>
      )}

      <div style={{ marginTop:'12px', paddingTop:'10px', borderTop:'1px solid #1e293b', textAlign:'center' }}>
        <p style={{ fontSize:'10px', color:'#334155', margin:0 }}>
          பேருந்து கண்காணிப்பு · Live Bus Tracking
        </p>
      </div>
    </div>
  )
}
