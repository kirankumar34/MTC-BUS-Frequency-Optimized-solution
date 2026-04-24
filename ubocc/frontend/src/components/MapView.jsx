import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const API = 'http://localhost:8000'

// ── Color palette for routes ────────────────────────────────────────────────
const ROUTE_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
  '#14B8A6', '#FB923C', '#A855F7', '#22D3EE', '#4ADE80',
]

// ── Bus icon factory ─────────────────────────────────────────────────────────
function createBusIcon(status, routeId, isSelected = false) {
  const colors = {
    normal:     '#22C55E',
    crowded:    '#F59E0B',
    delayed:    '#EF4444',
    overloaded: '#DC2626',
  }
  const color = colors[status] || colors.normal
  const size  = isSelected ? 38 : 28

  const pulse = (status === 'delayed' || status === 'overloaded')
    ? `<circle cx="14" cy="14" r="13" fill="${color}" opacity="0.3">
         <animate attributeName="r" from="13" to="22" dur="1.4s" repeatCount="indefinite"/>
         <animate attributeName="opacity" from="0.3" to="0" dur="1.4s" repeatCount="indefinite"/>
       </circle>`
    : ''

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 28 28">
      ${pulse}
      <circle cx="14" cy="14" r="12" fill="${color}" stroke="white" stroke-width="2.5"
              filter="url(#shadow)"/>
      <text x="14" y="10" text-anchor="middle" fill="white"
            font-size="4.5" font-weight="bold" font-family="monospace">
        ${String(routeId).substring(0, 5)}
      </text>
      <text x="14" y="18" text-anchor="middle" fill="white" font-size="8">🚌</text>
      <defs>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-opacity="0.4"/>
        </filter>
      </defs>
    </svg>`

  return L.divIcon({
    html:       svg,
    className:  '',
    iconSize:   [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

// ── Stop icon ─────────────────────────────────────────────────────────────────
function createStopIcon(isHighlighted = false) {
  const color = isHighlighted ? '#60A5FA' : '#475569'
  return L.divIcon({
    html: `<div style="
      width:10px;height:10px;border-radius:50%;
      background:${color};border:2px solid white;
      box-shadow:0 0 5px rgba(0,0,0,0.5)"></div>`,
    className:  '',
    iconSize:   [10, 10],
    iconAnchor: [5, 5],
  })
}

// ── Interpolate between two [lat,lng] points ──────────────────────────────────
function interpolate(from, to, t) {
  return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t]
}

// ─────────────────────────────────────────────────────────────────────────────
export default function MapView({ selectedBus, selectedStop, selectedRoute,
                                  onBusClick, onStopClick, onRouteClick }) {
  const mapRef         = useRef(null)
  const mapInst        = useRef(null)
  const busMarkers     = useRef({})        // bus_id → L.Marker
  const busAnim        = useRef({})        // bus_id → { from, to, progress, step }
  const routeLayers    = useRef({})        // route_id → { line, color }
  const stopMarkers    = useRef([])
  const animFrame      = useRef(null)
  const busData        = useRef([])        // latest fetched bus array
  const routesFetched  = useRef(false)
  const stopsFetched   = useRef(false)

  // ── Init map ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mapInst.current) return

    const map = L.map(mapRef.current, {
      center:           [13.0827, 80.2707],
      zoom:             12,
      zoomControl:      false,
      attributionControl: false,
    })

    // CartoDB Dark Matter — premium command-center look
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom:     19,
      attribution: '© OpenStreetMap contributors © CARTO',
      subdomains:  'abcd',
    }).addTo(map)

    L.control.zoom({ position: 'bottomright' }).addTo(map)
    mapInst.current = map

    loadRoutePaths()
    loadStops()
    startBusLoop()
    startAnimLoop()

    return () => {
      if (animFrame.current) cancelAnimationFrame(animFrame.current)
    }
  }, []) // eslint-disable-line

  // ── Load route polylines ─────────────────────────────────────────────────
  async function loadRoutePaths() {
    if (routesFetched.current) return
    routesFetched.current = true
    try {
      const routes = await fetch(`${API}/api/gps/routes`).then(r => r.json())
      if (!Array.isArray(routes)) return

      for (const [i, route] of routes.slice(0, 63).entries()) {
        try {
          const pd = await fetch(`${API}/api/routes/${route.route_id}/path`).then(r => r.json())
          if (pd.path && pd.path.length > 1) {
            const color = ROUTE_COLORS[i % ROUTE_COLORS.length]
            const line  = L.polyline(pd.path, {
              color, weight: 2.5, opacity: 0.55, smoothFactor: 1,
            }).addTo(mapInst.current)
            line.on('click', () => onRouteClick(route))
            routeLayers.current[route.route_id] = { line, color }
          }
        } catch { /* individual route failure is silent */ }
      }
    } catch { /* GPS data not ready */ }
  }

  // ── Load stop markers ────────────────────────────────────────────────────
  async function loadStops() {
    if (stopsFetched.current) return
    stopsFetched.current = true
    try {
      const stops = await fetch(`${API}/api/gps/stops`).then(r => r.json())
      if (!Array.isArray(stops)) return
      stops.forEach(stop => {
        const marker = L.marker([stop.lat, stop.lng], {
          icon:        createStopIcon(false),
          zIndexOffset: 100,
        }).addTo(mapInst.current)
          .on('click', () => onStopClick(stop))

        marker.bindTooltip(
          `<div style="font-size:11px;font-weight:bold">${stop.name}</div>
           <div style="font-size:10px;color:#94a3b8">${stop.routes?.length || 0} routes</div>`,
          { permanent: false, className: 'stop-tt', offset: [6, 0] }
        )
        stopMarkers.current.push({ marker, stop })
      })
    } catch { /* stops not ready */ }
  }

  // ── Fetch bus data every 3s ──────────────────────────────────────────────
  function startBusLoop() {
    const fetch_ = async () => {
      try {
        const raw  = await fetch(`${API}/api/buses`)
        const body = await raw.json()
        const buses = Array.isArray(body) ? body : (body.buses || [])

        buses.forEach(bus => {
          const prev = busData.current.find(b => b.bus_id === bus.bus_id)
          if (prev && prev.lat && bus.lat) {
            busAnim.current[bus.bus_id] = {
              from:     [prev.lat, prev.lng],
              to:       [bus.lat, bus.lng],
              progress: 0,
              step:     Math.min(0.08, bus.speed_kmph / 200),
            }
          }
        })
        busData.current = buses
      } catch { /* backend not ready */ }
    }
    fetch_()
    const timer = setInterval(fetch_, 3000)
    return () => clearInterval(timer)
  }

  // ── rAF smooth animation loop ────────────────────────────────────────────
  function startAnimLoop() {
    const tick = () => {
      const map = mapInst.current
      if (!map) { animFrame.current = requestAnimationFrame(tick); return }

      busData.current.forEach(bus => {
        const anim = busAnim.current[bus.bus_id]
        let pos    = [bus.lat, bus.lng]

        if (anim && anim.progress < 1) {
          anim.progress = Math.min(1, anim.progress + anim.step)
          pos = interpolate(anim.from, anim.to, anim.progress)
        }

        const isSelected = selectedBus?.bus_id === bus.bus_id
        const icon = createBusIcon(bus.status, bus.route_id, isSelected)

        if (!busMarkers.current[bus.bus_id]) {
          const mk = L.marker(pos, { icon, zIndexOffset: 1000 })
            .addTo(map)
            .on('click', () => onBusClick(bus))

          mk.bindPopup(`
            <div style="min-width:165px;font-family:system-ui">
              <div style="font-weight:700;font-size:14px;margin-bottom:4px">🚌 ${bus.bus_id}</div>
              <div>Route: <b>${bus.route_id}</b></div>
              <div>Speed: ${bus.speed_kmph} km/h</div>
              <div>Occupancy: ${bus.occupancy}%</div>
              <div>Status: <span style="color:${bus.status==='normal'?'#22c55e':'#ef4444'};font-weight:600">
                ${bus.status}</span></div>
              ${bus.delay_min > 0 ? `<div style="color:#ef4444">⚠ ${bus.delay_min} min late</div>` : ''}
            </div>
          `)
          busMarkers.current[bus.bus_id] = mk
        } else {
          busMarkers.current[bus.bus_id].setLatLng(pos)
          busMarkers.current[bus.bus_id].setIcon(icon)
        }
      })

      animFrame.current = requestAnimationFrame(tick)
    }
    animFrame.current = requestAnimationFrame(tick)
  }

  // ── React: selected bus ──────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedBus || !mapInst.current) return
    const mk = busMarkers.current[selectedBus.bus_id]
    if (mk) {
      mapInst.current.flyTo(mk.getLatLng(), 15, { duration: 1.2 })
      mk.openPopup()
    }
    // Highlight route
    Object.entries(routeLayers.current).forEach(([rid, { line }]) => {
      if (rid === String(selectedBus.route_id)) {
        line.setStyle({ weight: 5, opacity: 1 })
        line.bringToFront()
      } else {
        line.setStyle({ weight: 2, opacity: 0.25 })
      }
    })
  }, [selectedBus])

  // ── React: selected stop ─────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedStop || !mapInst.current) return
    mapInst.current.flyTo([selectedStop.lat, selectedStop.lng], 16, { duration: 1.0 })
    // Highlight stop marker
    stopMarkers.current.forEach(({ marker, stop }) => {
      marker.setIcon(createStopIcon(stop.name === selectedStop.name))
    })
  }, [selectedStop])

  // ── React: selected route ────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedRoute) return
    Object.entries(routeLayers.current).forEach(([rid, { line }]) => {
      if (rid === String(selectedRoute.route_id)) {
        line.setStyle({ weight: 5, opacity: 1 })
        line.bringToFront()
        if (mapInst.current) mapInst.current.fitBounds(line.getBounds(), { padding: [40, 40] })
      } else {
        line.setStyle({ weight: 2, opacity: 0.25 })
      }
    })
  }, [selectedRoute])

  return (
    <>
      <div
        ref={mapRef}
        style={{ width: '100%', height: '100%', background: '#0f172a' }}
      />
      <style>{`
        .stop-tt {
          background: rgba(15,23,42,0.95) !important;
          border: 1px solid #334155 !important;
          border-radius: 8px !important;
          color: #e2e8f0 !important;
          padding: 6px 10px !important;
          font-family: system-ui, sans-serif !important;
        }
        .stop-tt::before { display:none !important; }
        .leaflet-popup-content-wrapper {
          background: rgba(15,23,42,0.98) !important;
          border: 1px solid #1e3a5f !important;
          border-radius: 12px !important;
          color: #e2e8f0 !important;
          font-family: system-ui, sans-serif !important;
        }
        .leaflet-popup-tip { background: rgba(15,23,42,0.98) !important; }
        .leaflet-popup-close-button { color: #94a3b8 !important; }
      `}</style>
    </>
  )
}
