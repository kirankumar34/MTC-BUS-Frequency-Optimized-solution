const STATUS_CONFIG = {
  normal:     { color: '#4ade80', bg: 'rgba(34,197,94,0.1)',  label: '● On time'           },
  crowded:    { color: '#fbbf24', bg: 'rgba(245,158,11,0.1)', label: '● Crowded'            },
  delayed:    { color: '#f87171', bg: 'rgba(239,68,68,0.1)',  label: '● Delayed'            },
  overloaded: { color: '#f87171', bg: 'rgba(239,68,68,0.1)',  label: '● Overloaded'         },
}

export default function BusInfoCard({ bus, onClose }) {
  const s = STATUS_CONFIG[bus.status] || STATUS_CONFIG.normal
  const label = bus.status === 'delayed'
    ? `● Delayed ${bus.delay_min} min`
    : s.label

  return (
    <div style={{
      position: 'absolute', bottom: '88px', left: '12px', right: '12px',
      zIndex: 1000,
      background: 'rgba(10,17,35,0.98)', backdropFilter: 'blur(20px)',
      border: '1px solid rgba(59,130,246,0.25)',
      borderRadius: '20px', padding: '14px 16px',
      boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
      animation: 'slideUp 0.28s cubic-bezier(0.32,0.72,0,1)',
    }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{
            width:'40px', height:'40px', borderRadius:'12px',
            background:'linear-gradient(135deg,#eab308,#ca8a04)',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px',
          }}>🚌</div>
          <div>
            <div style={{ fontWeight:700, color:'#e2e8f0', fontSize:'14px' }}>{bus.bus_id}</div>
            <div style={{ fontSize:'11px', color:'#64748b' }}>Route {bus.route_id}</div>
          </div>
        </div>
        <button onClick={onClose} style={{
          background:'rgba(255,255,255,0.06)', border:'1px solid #1e3a5f',
          borderRadius:'8px', color:'#64748b', cursor:'pointer',
          width:'28px', height:'28px', fontSize:'13px',
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>✕</button>
      </div>

      {/* Status badge */}
      <div style={{
        background: s.bg, borderRadius:'10px', padding:'6px 12px',
        marginBottom:'10px', display:'inline-block',
      }}>
        <span style={{ color: s.color, fontWeight:600, fontSize:'12px' }}>{label}</span>
      </div>

      {/* Stats grid */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px' }}>
        {[
          { val: `${bus.speed_kmph}`, unit: 'km/h',      label: 'Speed'     },
          { val: `${bus.occupancy}%`, unit: 'capacity',  label: 'Occupancy' },
          { val: bus.direction,       unit: 'bound',      label: 'Direction' },
        ].map(({ val, unit, label: lbl }) => (
          <div key={lbl} style={{
            background:'rgba(255,255,255,0.04)', border:'1px solid #1e293b',
            borderRadius:'10px', padding:'8px', textAlign:'center',
          }}>
            <div style={{ fontWeight:700, color:'#e2e8f0', fontSize:'13px', textTransform:'capitalize' }}>{val}</div>
            <div style={{ fontSize:'9px', color:'#475569', marginTop:'2px' }}>{lbl}</div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity:0; transform:translateY(16px); }
          to   { opacity:1; transform:translateY(0); }
        }
      `}</style>
    </div>
  )
}
