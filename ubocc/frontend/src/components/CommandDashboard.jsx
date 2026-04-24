import { useState, useEffect, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, CircleMarker, Marker, Polyline, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { fetchBuses, fetchStops, fetchIncidents, fetchKPIs, fetchEvents, fetchDispatch, approveDispatch } from '../api'

// Route colors for polylines
const ROUTE_COLORS = {
  R001: '#EF4444', R002: '#3B82F6', R003: '#22C55E', R004: '#F59E0B',
  R005: '#A855F7', R006: '#06B6D4', R007: '#F97316', R008: '#EC4899',
  R009: '#84CC16', R010: '#14B8A6',
}

// Route polyline waypoints
const ROUTE_POLYLINES = {
  R001: [[13.0956,80.2876],[13.0827,80.2757],[13.0770,80.2613],[13.0641,80.2501],[13.0388,80.2323],[13.0227,80.2202],[13.0068,80.2206],[12.9893,80.1965],[12.9673,80.1574],[12.9516,80.1417],[12.9249,80.1000]],
  R002: [[13.0956,80.2876],[13.0827,80.2757],[13.0622,80.2793],[13.0523,80.2818],[13.0330,80.2677],[13.0012,80.2565],[12.9990,80.2716],[12.9833,80.2584],[12.9673,80.1574],[12.9249,80.1000]],
  R003: [[12.9990,80.2716],[13.0012,80.2565],[13.0330,80.2677],[13.0388,80.2323],[13.0503,80.2121],[13.0600,80.2412],[13.0849,80.2101],[13.1135,80.2117]],
  R004: [[13.0044,80.2599],[12.9833,80.2584],[12.9587,80.2415],[12.9010,80.2279],[12.9007,80.2267]],
  R005: [[13.0068,80.2206],[13.0227,80.2202],[13.0388,80.2323]],
  R006: [[13.0827,80.2757],[13.0694,80.1952],[13.0503,80.2121],[13.0227,80.2202],[13.0068,80.2206],[12.9893,80.1965],[12.9745,80.2150],[12.9815,80.2209]],
  R007: [[13.0956,80.2876],[13.0694,80.1952],[13.0503,80.2121],[13.0367,80.1574],[12.9673,80.1574],[12.9516,80.1417],[12.9249,80.1000]],
  R008: [[13.0330,80.2677],[12.9990,80.2716],[12.9815,80.2209],[12.9745,80.2150],[12.9211,80.1963],[12.9249,80.1000]],
  R009: [[13.0694,80.1952],[13.0849,80.2101],[13.0600,80.2412],[13.0388,80.2323],[13.0227,80.2202],[13.0044,80.2599]],
  R010: [[13.1666,80.3107],[13.1171,80.2494],[13.0956,80.2876]],
}

function getBusColor(bus) {
  if (bus.status === 'overloaded' || bus.occupancy_pct > 100) return '#EF4444'
  if (bus.status === 'delayed' || bus.delay_min > 5) return '#F97316'
  return '#22C55E'
}

function createBusIcon(color) {
  return L.divIcon({
    html: `<div style="
      width:24px;height:24px;border-radius:50%;
      background:${color};border:2px solid white;
      display:flex;align-items:center;justify-content:center;
      font-size:11px;box-shadow:0 0 8px ${color}88;
      cursor:pointer;
    ">🚌</div>`,
    className: 'bus-marker-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

const stadiumIcon = L.divIcon({
  html: `<div style="width:30px;height:30px;border-radius:4px;background:#F59E0B;border:2px solid #FCD34D;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 0 12px #F59E0B88;">🏏</div>`,
  className: 'bus-marker-icon',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
})

function IncidentPulse({ lat, lng, color = '#EF4444' }) {
  return (
    <>
      <CircleMarker center={[lat, lng]} radius={20}
        fillColor={color} fillOpacity={0.1} color={color} weight={1} opacity={0.3} />
      <CircleMarker center={[lat, lng]} radius={8}
        fillColor={color} fillOpacity={0.6} color="white" weight={2} opacity={0.9} />
    </>
  )
}

// KPI Card component
function KPICard({ label, value, unit, trend, color = '#60A5FA', icon }) {
  return (
    <div style={{
      background: '#1E293B', border: `1px solid #334155`,
      borderLeft: `3px solid ${color}`, borderRadius: '6px',
      padding: '10px 12px', marginBottom: '6px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
        <span style={{ fontSize: '14px' }}>{icon}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '4px' }}>
        <span style={{ fontSize: '22px', fontWeight: 700, color, fontFamily: 'JetBrains Mono, monospace' }}>{value}</span>
        {unit && <span style={{ fontSize: '11px', color: '#64748B' }}>{unit}</span>}
        {trend && <span style={{ fontSize: '11px', color: trend > 0 ? '#EF4444' : '#22C55E', marginLeft: '4px' }}>
          {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </span>}
      </div>
    </div>
  )
}

// Alert Feed item
function AlertItem({ incident }) {
  const colors = { High: '#EF4444', Medium: '#F97316', Low: '#F59E0B', predicted: '#A855F7' }
  const icons = { 'Road Closure': '🚧', 'Waterlogging': '🌧️', 'Heavy Traffic': '🚦', 'Bus Bunching': '🚌', 'Crowd Surge': '👥', 'Metro Work': '🚇' }
  const color = colors[incident.severity] || '#64748B'
  return (
    <div style={{
      background: '#0f1929', border: `1px solid #1e3a5f`,
      borderLeft: `3px solid ${color}`, borderRadius: '5px',
      padding: '8px 10px', marginBottom: '6px', animation: 'slide-in-up 0.3s ease-out'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: '#E2E8F0' }}>
          {icons[incident.type] || '⚠️'} {incident.type}
        </span>
        <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '3px',
          background: incident.status === 'active' ? 'rgba(239,68,68,0.15)' : 'rgba(165,85,247,0.15)',
          color: incident.status === 'active' ? '#F87171' : '#C084FC' }}>
          {incident.status.toUpperCase()}
        </span>
      </div>
      <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '3px' }}>{incident.location_name}</div>
      <div style={{ fontSize: '10px', color: '#F59E0B', marginTop: '2px' }}>
        Routes: {incident.affected_routes}
      </div>
    </div>
  )
}

export default function CommandDashboard() {
  const [buses, setBuses] = useState([])
  const [stops, setStops] = useState([])
  const [incidents, setIncidents] = useState([])
  const [kpis, setKpis] = useState({})
  const [events, setEvents] = useState([])
  const [dispatch, setDispatch] = useState([])
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(null)
  const [approvedMsg, setApprovedMsg] = useState(null)

  const loadData = useCallback(async () => {
    try {
      const [busRes, stopRes, incRes, kpiRes, evtRes, dispRes] = await Promise.all([
        fetchBuses(), fetchStops(), fetchIncidents(), fetchKPIs(), fetchEvents(), fetchDispatch()
      ])
      setBuses(busRes.data)
      setStops(stopRes.data)
      setIncidents(incRes.data)
      setKpis(kpiRes.data)
      setEvents(evtRes.data)
      setDispatch(dispRes.data)
      setLoading(false)
    } catch (e) {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
    const interval = setInterval(() => {
      fetchBuses().then(r => setBuses(r.data)).catch(() => {})
      fetchKPIs().then(r => setKpis(r.data)).catch(() => {})
    }, 3000)
    return () => clearInterval(interval)
  }, [loadData])

  const pendingActions = dispatch.filter(d => d.status === 'pending').slice(0, 1)

  const handleApprove = async (action_id) => {
    setApproving(action_id)
    try {
      const res = await approveDispatch(action_id)
      setApprovedMsg(res.data)
      await loadData()
    } catch (e) {}
    setApproving(null)
    setTimeout(() => setApprovedMsg(null), 5000)
  }

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0B1120' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📡</div>
          <div style={{ color: '#60A5FA', fontSize: '14px' }}>Connecting to Chennai U-BOCC...</div>
          <div style={{ color: '#475569', fontSize: '11px', marginTop: '6px' }}>Loading live bus data</div>
        </div>
      </div>
    )
  }

  const eventBanner = events[0]

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{
        background: '#0f1929', borderBottom: '1px solid #1e3a5f',
        padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0
      }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#E2E8F0' }}>📡 COMMAND DASHBOARD</div>
        <div style={{ flex: 1 }} />
        {/* KPI Strip */}
        {[
          { label: 'Avg Wait', val: `${kpis.avg_wait_time_min || 22} min`, color: '#60A5FA' },
          { label: 'Bunching', val: `${kpis.bunching_incidents || 3}`, color: '#F97316' },
          { label: 'Overloaded', val: `${kpis.overloaded_buses || 2}`, color: '#EF4444' },
          { label: 'Alerts Today', val: `${kpis.alerts_sent_today || 4}`, color: '#22C55E' },
          { label: 'Buses Live', val: `${kpis.total_buses_tracked || 15}`, color: '#A855F7' },
        ].map(k => (
          <div key={k.label} style={{
            background: '#1E293B', border: '1px solid #334155', borderRadius: '5px',
            padding: '4px 10px', textAlign: 'center'
          }}>
            <div style={{ fontSize: '9px', color: '#64748B', textTransform: 'uppercase' }}>{k.label}</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: k.color, fontFamily: 'JetBrains Mono, monospace' }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* IPL Event Banner */}
      {eventBanner && (
        <div style={{
          background: 'linear-gradient(90deg, rgba(245,158,11,0.15) 0%, rgba(245,158,11,0.05) 100%)',
          borderBottom: '1px solid rgba(245,158,11,0.3)',
          padding: '5px 16px', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0
        }}>
          <span style={{ fontSize: '12px' }}>🏏</span>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#FCD34D' }}>IPL TONIGHT</span>
          <span style={{ fontSize: '11px', color: '#F59E0B' }}>
            {eventBanner.event_name} | {eventBanner.venue} | 7:30 PM
          </span>
          <span style={{ fontSize: '11px', color: '#94A3B8' }}>|</span>
          <span style={{ fontSize: '11px', color: '#FB923C' }}>
            Expected crowd: {eventBanner.expected_attendance?.toLocaleString()} | Surge: {eventBanner.surge_factor}x
          </span>
          <span style={{ fontSize: '11px', color: '#94A3B8' }}>|</span>
          <span style={{ fontSize: '11px', color: '#F87171' }}>
            Routes IMPACTED: {eventBanner.affected_routes?.replace(/;/g, ', ')}
          </span>
          <div style={{ animation: 'blink 1.5s ease infinite', marginLeft: '4px' }}>
            <span style={{ fontSize: '9px', padding: '2px 6px', background: 'rgba(239,68,68,0.2)', color: '#F87171', borderRadius: '3px', border: '1px solid rgba(239,68,68,0.3)' }}>ALERT ACTIVE</span>
          </div>
        </div>
      )}

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left alert panel */}
        <div style={{ width: '220px', minWidth: '220px', borderRight: '1px solid #1e3a5f',
          display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0a0f1e' }}>
          <div style={{ padding: '8px 10px', borderBottom: '1px solid #1e3a5f', flexShrink: 0 }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '1px' }}>
              ⚠️ Active Alerts
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
            {incidents.map(i => <AlertItem key={i.incident_id} incident={i} />)}
          </div>

          {/* Legend */}
          <div style={{ padding: '8px 10px', borderTop: '1px solid #1e3a5f', flexShrink: 0 }}>
            <div style={{ fontSize: '9px', color: '#475569', textTransform: 'uppercase', marginBottom: '5px' }}>Bus Status</div>
            {[['#22C55E','Normal'],['#F97316','Delayed'],['#EF4444','Overloaded']].map(([c,l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: c, flexShrink: 0 }} />
                <span style={{ fontSize: '10px', color: '#94A3B8' }}>{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Map */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <MapContainer
            center={[13.0600, 80.2300]}
            zoom={12}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />

            {/* Route polylines */}
            {Object.entries(ROUTE_POLYLINES).map(([routeId, positions]) => (
              <Polyline key={routeId} positions={positions}
                color={ROUTE_COLORS[routeId] || '#60A5FA'}
                weight={2} opacity={0.6} dashArray="4 4" />
            ))}

            {/* Stops */}
            {stops.map(s => (
              <CircleMarker key={s.stop_id} center={[s.lat, s.lng]}
                radius={4} fillColor="#3B82F6" fillOpacity={0.8}
                color="#60A5FA" weight={1}>
                <Popup>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', minWidth: '180px' }}>
                    <div style={{ fontWeight: 700, marginBottom: '4px' }}>{s.stop_name}</div>
                    <div style={{ color: '#666', fontSize: '11px' }}>{s.stop_name_tamil}</div>
                    <div style={{ fontSize: '11px', marginTop: '4px' }}>Zone: {s.zone}</div>
                    <div style={{ fontSize: '11px' }}>Routes: {s.routes_serving}</div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}

            {/* Chepauk Stadium */}
            <Marker position={[13.0622, 80.2793]} icon={stadiumIcon}>
              <Popup>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px' }}>
                  <div style={{ fontWeight: 700 }}>🏏 MA Chidambaram Stadium</div>
                  <div style={{ color: '#F59E0B', marginTop: '4px', fontSize: '11px' }}>CSK vs MI — 7:30 PM</div>
                  <div style={{ fontSize: '11px' }}>Capacity: 37,505</div>
                  <div style={{ fontSize: '11px', color: '#EF4444' }}>⚠️ High crowd surge expected</div>
                </div>
              </Popup>
            </Marker>

            {/* Incident markers */}
            {incidents.filter(i => i.status === 'active').map(i => (
              <IncidentPulse key={i.incident_id} lat={i.lat} lng={i.lng}
                color={i.severity === 'High' ? '#EF4444' : '#F97316'} />
            ))}

            {/* Live buses */}
            {buses.map(bus => (
              <Marker key={bus.bus_id} position={[bus.lat, bus.lng]}
                icon={createBusIcon(getBusColor(bus))}>
                <Popup>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', minWidth: '200px' }}>
                    <div style={{ fontWeight: 700, marginBottom: '4px' }}>🚌 {bus.bus_id}</div>
                    <div style={{ fontSize: '11px' }}>Route: {bus.route_id}</div>
                    <div style={{ fontSize: '11px' }}>Status: <span style={{ color: getBusColor(bus), fontWeight: 600 }}>{bus.status}</span></div>
                    <div style={{ fontSize: '11px' }}>Occupancy: {Math.round(bus.occupancy_pct)}%</div>
                    <div style={{ fontSize: '11px' }}>Speed: {bus.speed_kmph} km/h</div>
                    {bus.delay_min > 0 && <div style={{ fontSize: '11px', color: '#F87171' }}>Delay: {bus.delay_min} min</div>}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* Map overlay: route legend */}
          <div style={{
            position: 'absolute', bottom: '16px', left: '16px', zIndex: 1000,
            background: 'rgba(11,17,32,0.92)', border: '1px solid #1e3a5f',
            borderRadius: '6px', padding: '8px 10px'
          }}>
            <div style={{ fontSize: '9px', color: '#475569', textTransform: 'uppercase', marginBottom: '5px' }}>Routes</div>
            {Object.entries(ROUTE_COLORS).slice(0, 7).map(([r, c]) => (
              <div key={r} style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px' }}>
                <div style={{ width: '20px', height: '3px', background: c, borderRadius: '2px' }} />
                <span style={{ fontSize: '10px', color: '#94A3B8' }}>{r.replace('R00', '').replace('R0', '').replace('R', '')}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div style={{ width: '260px', minWidth: '260px', borderLeft: '1px solid #1e3a5f',
          display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0a0f1e' }}>
          <div style={{ padding: '8px 10px', borderBottom: '1px solid #1e3a5f', flexShrink: 0 }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#60A5FA', textTransform: 'uppercase', letterSpacing: '1px' }}>
              🤖 AI Recommendations
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {/* Success message */}
            {approvedMsg && (
              <div style={{
                background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
                borderRadius: '6px', padding: '8px', marginBottom: '8px', animation: 'slide-in-up 0.3s ease-out'
              }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#4ADE80' }}>✓ {approvedMsg.message}</div>
                <div style={{ fontSize: '10px', color: '#22C55E', marginTop: '4px' }}>
                  Depot: {approvedMsg.depot} | Buses: {approvedMsg.buses_dispatched}
                </div>
                <div style={{ fontSize: '10px', color: '#4ADE80', marginTop: '3px', fontStyle: 'italic' }}>
                  📱 {approvedMsg.driver_alert}
                </div>
              </div>
            )}

            {/* Pending actions */}
            {pendingActions.map(action => (
              <div key={action.action_id} style={{
                background: '#1E293B', border: '1px solid #F59E0B',
                borderRadius: '6px', padding: '10px', marginBottom: '8px',
                boxShadow: '0 0 12px rgba(245,158,11,0.2)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#FCD34D' }}>🤖 AI RECOMMENDATION</span>
                  <span style={{ fontSize: '9px', padding: '1px 5px', background: 'rgba(245,158,11,0.15)', color: '#F59E0B', borderRadius: '3px' }}>PENDING</span>
                </div>
                <div style={{ fontSize: '10px', color: '#94A3B8', marginBottom: '6px' }}>
                  <span style={{ color: '#60A5FA' }}>{action.trigger_type}</span>: {action.trigger_description}
                </div>
                <div style={{ fontSize: '11px', color: '#E2E8F0', marginBottom: '8px', lineHeight: '1.5' }}>
                  {action.recommendation}
                </div>
                <div style={{ fontSize: '10px', color: '#64748B', marginBottom: '8px' }}>
                  Route: {action.route_id} | Depot: {action.depot_assigned} | Buses: {action.buses_requested}
                </div>
                {/* Confidence bar */}
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#64748B', marginBottom: '3px' }}>
                    <span>Confidence</span><span>87%</span>
                  </div>
                  <div style={{ height: '4px', background: '#1e3a5f', borderRadius: '2px' }}>
                    <div style={{ height: '100%', width: '87%', background: '#22C55E', borderRadius: '2px' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => handleApprove(action.action_id)}
                    disabled={approving === action.action_id}
                    style={{
                      flex: 1, padding: '6px', background: 'rgba(34,197,94,0.15)',
                      border: '1px solid rgba(34,197,94,0.4)', borderRadius: '5px',
                      color: '#4ADE80', fontSize: '10px', fontWeight: 700, cursor: 'pointer'
                    }}>
                    {approving === action.action_id ? '...' : '✓ APPROVE'}
                  </button>
                  <button style={{
                    flex: 1, padding: '6px', background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.3)', borderRadius: '5px',
                    color: '#F87171', fontSize: '10px', fontWeight: 700, cursor: 'pointer'
                  }}>✗ REJECT</button>
                </div>
                <div style={{ marginTop: '6px', fontSize: '10px', color: '#475569', textAlign: 'center' }}>
                  Officer: {action.officer_name}
                </div>
              </div>
            ))}

            {/* Fleet summary */}
            <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '6px', padding: '10px', marginBottom: '8px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', marginBottom: '8px', textTransform: 'uppercase' }}>Fleet Status</div>
              {[
                { label: 'Normal', count: buses.filter(b => b.status === 'in_transit').length, color: '#22C55E' },
                { label: 'At Stop', count: buses.filter(b => b.status === 'at_stop').length, color: '#3B82F6' },
                { label: 'Delayed', count: buses.filter(b => b.status === 'delayed').length, color: '#F97316' },
                { label: 'Overloaded', count: buses.filter(b => b.status === 'overloaded').length, color: '#EF4444' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color }} />
                    <span style={{ fontSize: '11px', color: '#94A3B8' }}>{s.label}</span>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: s.color, fontFamily: 'JetBrains Mono, monospace' }}>{s.count}</span>
                </div>
              ))}
            </div>

            {/* Active incidents summary */}
            <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '6px', padding: '10px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', marginBottom: '8px', textTransform: 'uppercase' }}>Active Incidents</div>
              {incidents.filter(i => i.status !== 'resolved').slice(0, 4).map(i => (
                <div key={i.incident_id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '4px 0', borderBottom: '1px solid #1e3a5f'
                }}>
                  <div style={{ fontSize: '10px', color: '#94A3B8', flex: 1 }}>
                    <div style={{ fontWeight: 600, color: i.severity === 'High' ? '#F87171' : '#FB923C' }}>{i.type}</div>
                    <div style={{ color: '#64748B', fontSize: '9px' }}>{i.location_name.substring(0, 28)}...</div>
                  </div>
                  <span style={{
                    fontSize: '9px', padding: '1px 5px', borderRadius: '3px', flexShrink: 0, marginLeft: '4px',
                    background: i.severity === 'High' ? 'rgba(239,68,68,0.15)' : 'rgba(249,115,22,0.15)',
                    color: i.severity === 'High' ? '#F87171' : '#FB923C'
                  }}>{i.severity}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
