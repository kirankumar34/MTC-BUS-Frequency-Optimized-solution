import { useState, useEffect } from 'react'
import MapView           from './MapView'
import SearchBar         from './SearchBar'
import StopArrivalBoard  from './StopArrivalBoard'
import BottomSheet       from './BottomSheet'
import BusInfoCard       from './BusInfoCard'
import TrackingPanel     from './TrackingPanel'

const API = 'http://localhost:8000'

/**
 * LiveMapView — Chalo/Ola Maps-style live bus tracking.
 * Embedded as a route inside the existing U-BOCC sidebar layout.
 */
export default function LiveMapView() {
  const [selectedBus,   setSelectedBus]   = useState(null)
  const [selectedStop,  setSelectedStop]  = useState(null)
  const [selectedRoute, setSelectedRoute] = useState(null)
  const [view,          setView]          = useState('map') // 'map' | 'arrivals' | 'route'
  const [dataStatus,    setDataStatus]    = useState(null)
  const [busCount,      setBusCount]      = useState(0)

  // Check GPS data status on mount
  useEffect(() => {
    fetch(`${API}/api/gps/status`)
      .then(r => r.json())
      .then(s => setDataStatus(s))
      .catch(() => {})

    // Poll bus count for header KPI
    const t = setInterval(() => {
      fetch(`${API}/api/buses`)
        .then(r => r.json())
        .then(d => setBusCount(Array.isArray(d) ? d.length : 0))
        .catch(() => {})
    }, 5000)
    return () => clearInterval(t)
  }, [])

  const handleBusClick  = (bus)   => { setSelectedBus(bus); setView('map') }
  const handleStopClick = (stop)  => { setSelectedStop(stop); setSelectedBus(null); setView('arrivals') }
  const handleRouteClick= (route) => { setSelectedRoute(route); setSelectedBus(null); setView('route') }
  const handleClose     = ()      => { setView('map') }

  const dataReady = dataStatus?.road_paths_ready && dataStatus?.bus_positions_ready

  return (
    <div style={{ position:'relative', width:'100%', height:'100%', overflow:'hidden', background:'#0f172a' }}>

      {/* Full-screen map */}
      <MapView
        selectedBus={selectedBus}
        selectedStop={selectedStop}
        selectedRoute={selectedRoute}
        onBusClick={handleBusClick}
        onStopClick={handleStopClick}
        onRouteClick={handleRouteClick}
      />

      {/* ── Top overlay bar ─────────────────────────────────────────── */}
      <div style={{
        position:'absolute', top:'12px', left:'12px', right:'12px', zIndex:1000,
        display:'flex', flexDirection:'column', gap:'8px',
      }}>
        {/* KPI strip */}
        <div style={{
          display:'flex', gap:'8px', justifyContent:'flex-end',
          pointerEvents:'none',
        }}>
          <div style={{
            background:'rgba(10,17,35,0.85)', backdropFilter:'blur(12px)',
            border:'1px solid rgba(59,130,246,0.2)', borderRadius:'10px',
            padding:'5px 12px', display:'flex', alignItems:'center', gap:'8px',
          }}>
            <div style={{ width:'6px', height:'6px', borderRadius:'50%',
                          background: dataReady ? '#22c55e' : '#f59e0b',
                          boxShadow: dataReady ? '0 0 6px #22c55e' : '0 0 6px #f59e0b' }} />
            <span style={{ fontSize:'10px', color:'#94a3b8', fontFamily:'monospace' }}>
              {dataReady
                ? `${busCount > 0 ? busCount : '—'} buses live · Real MTC GPS data`
                : 'GPS data not loaded — run enrich_data.py'}
            </span>
          </div>
        </div>

        {/* Search bar */}
        <SearchBar
          onSelectStop={handleStopClick}
          onSelectRoute={handleRouteClick}
        />
      </div>

      {/* ── Data not ready banner ────────────────────────────────────── */}
      {dataStatus && !dataReady && (
        <div style={{
          position:'absolute', bottom:'80px', left:'12px', right:'12px', zIndex:1000,
          background:'rgba(245,158,11,0.12)', border:'1px solid rgba(245,158,11,0.4)',
          borderRadius:'14px', padding:'14px 16px',
        }}>
          <div style={{ fontWeight:700, color:'#fbbf24', fontSize:'13px', marginBottom:'4px' }}>
            ⚡ GPS Data Not Ready
          </div>
          <div style={{ fontSize:'11px', color:'#d97706', lineHeight:1.6 }}>
            Run the data pipeline first:<br/>
            <code style={{ color:'#fcd34d', background:'rgba(0,0,0,0.3)', padding:'2px 6px', borderRadius:'4px' }}>
              cd ubocc && python scripts/enrich_data.py
            </code><br/>
            This takes ~5 min (OSRM API calls). Then restart the backend.
          </div>
        </div>
      )}

      {/* ── Bus info card (floating, above bottom sheet) ─────────────── */}
      {selectedBus && view === 'map' && (
        <BusInfoCard bus={selectedBus} onClose={() => setSelectedBus(null)} />
      )}

      {/* ── Bottom sheet ─────────────────────────────────────────────── */}
      <BottomSheet isOpen={view !== 'map'} onClose={handleClose}>
        {view === 'arrivals' && selectedStop && (
          <StopArrivalBoard stop={selectedStop} />
        )}
        {view === 'route' && selectedRoute && (
          <TrackingPanel route={selectedRoute} onBusSelect={handleBusClick} />
        )}
      </BottomSheet>

      {/* ── Legend strip (bottom-left) ────────────────────────────────── */}
      <div style={{
        position:'absolute', bottom:'12px', left:'12px', zIndex:900,
        background:'rgba(10,17,35,0.85)', backdropFilter:'blur(12px)',
        border:'1px solid rgba(255,255,255,0.06)', borderRadius:'12px',
        padding:'8px 12px', display:'flex', gap:'12px', alignItems:'center',
      }}>
        {[
          { color:'#22c55e', label:'Normal'     },
          { color:'#f59e0b', label:'Crowded'    },
          { color:'#ef4444', label:'Delayed'    },
          { color:'#dc2626', label:'Overloaded' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display:'flex', alignItems:'center', gap:'5px' }}>
            <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:color,
                          boxShadow:`0 0 4px ${color}` }} />
            <span style={{ fontSize:'9px', color:'#64748b' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
