@# Chennai U-BOCC — Realistic Bus Tracking Upgrade Prompt
## For Google Antigravity | Based on Actual Dataset Analysis
### Paste this entire file as your Antigravity build instruction

---

## WHAT YOUR CURRENT PROJECT HAS (READ THIS FIRST)

After analyzing your uploaded files, here is the exact state of your dataset:

| File | Contents | Status |
|------|----------|--------|
| `route_detail.csv` | 606 routes × 8,223 stop records × 1,339 unique stops, scraped from mtcbus.tn.gov.in | ✅ Real MTC data |
| `stopdata.csv` | 1,280 bus stops with GPS lat/lng coordinates | ✅ Real GPS data |
| `routedata.csv` | 63 routes with stop_id sequences (uses GPS stop IDs) | ✅ Partial GPS routes |
| Current notebooks | Network graph visualization using matplotlib + networkx | ❌ Not on real map |
| Bus animation | None — abstract graph only | ❌ Missing entirely |
| Real-time tracking | None | ❌ Missing entirely |

**Critical finding**: Only ~214 of 1,339 stops have direct GPS matches by name.
The `routedata.csv` file contains 63 routes already linked to GPS stop IDs — use these
as the primary GPS-accurate routes for the tracking demo.

**Your upgrade goal**: Transform the matplotlib network graph into a
Chalo/Chennai One-style live bus tracking app on a real Chennai map.

---

## TECH STACK FOR THIS UPGRADE

```
Frontend  : React 18 + Vite + Tailwind CSS
Map       : Leaflet.js (react-leaflet) + OpenStreetMap tiles
Routing   : OSRM public API for road-snapping bus paths
Backend   : Python FastAPI
Data      : Your existing CSVs + enrichment layer
Animation : CSS transitions + requestAnimationFrame (smooth bus movement)
State     : Zustand (lightweight, fast for map state)
Charts    : Recharts
```

---

## STEP 1 — DATA PIPELINE (Python script: `scripts/enrich_data.py`)

Build this script FIRST. It transforms your raw CSVs into a GPS-enriched,
animation-ready dataset.

```python
"""
scripts/enrich_data.py
Transforms route_detail.csv + stopdata.csv + routedata.csv
into animation-ready JSON for the frontend.
"""

import pandas as pd
import json
import requests
import time
from difflib import get_close_matches

# ─────────────────────────────────────────
# LOAD YOUR ACTUAL DATA FILES
# ─────────────────────────────────────────
route_df = pd.read_csv('data/route_detail.csv')
stop_gps_df = pd.read_csv('data/stopdata.csv')
route_seq_df = pd.read_csv('data/routedata.csv')

# Clean
route_df = route_df.iloc[:, 1:]  # drop index column
route_df['stop_name'] = route_df['stop_name'].str.strip().str.upper()

# Build GPS lookup dictionary from stopdata.csv
gps_lookup = {}
for _, row in stop_gps_df.iterrows():
    if 12.4 < row['Lat'] < 13.5 and 79.8 < row['Lng'] < 80.5:  # valid Chennai bbox
        gps_lookup[row['Stop Name'].strip().upper()] = {
            'lat': row['Lat'],
            'lng': row['Lng'],
            'stop_id': row['Stop_id']
        }

# ─────────────────────────────────────────
# FUZZY MATCH: get GPS for stops not directly matched
# ─────────────────────────────────────────
def get_gps_for_stop(stop_name, gps_lookup):
    """Try exact match first, then fuzzy match."""
    name_upper = stop_name.strip().upper()
    
    # Exact match
    if name_upper in gps_lookup:
        return gps_lookup[name_upper]
    
    # Fuzzy match (threshold 0.75)
    candidates = list(gps_lookup.keys())
    matches = get_close_matches(name_upper, candidates, n=1, cutoff=0.75)
    if matches:
        return gps_lookup[matches[0]]
    
    return None

# ─────────────────────────────────────────
# BUILD GPS-ENRICHED ROUTE SEQUENCES
# ─────────────────────────────────────────
routes_enriched = {}

for route_id, group in route_df.groupby('route_id'):
    stops = []
    for _, row in group.iterrows():
        gps = get_gps_for_stop(row['stop_name'], gps_lookup)
        stops.append({
            'seq': int(row['stop_id']),
            'name': row['stop_name'],
            'lat': gps['lat'] if gps else None,
            'lng': gps['lng'] if gps else None,
            'has_gps': gps is not None
        })
    
    # Only include routes where at least 40% of stops have GPS
    gps_count = sum(1 for s in stops if s['has_gps'])
    coverage = gps_count / len(stops) if stops else 0
    
    if coverage >= 0.4:
        routes_enriched[route_id] = {
            'route_id': str(route_id),
            'stops': stops,
            'stop_count': len(stops),
            'gps_coverage_pct': round(coverage * 100, 1)
        }

print(f"Routes with >=40% GPS coverage: {len(routes_enriched)}")

# Save enriched routes
with open('data/routes_gps_enriched.json', 'w') as f:
    json.dump(routes_enriched, f, indent=2)

# ─────────────────────────────────────────
# OSRM ROAD SNAPPING: get actual road paths between stops
# Uses public OSRM API — no key needed
# ─────────────────────────────────────────
OSRM_BASE = "http://router.project-osrm.org/route/v1/driving"

def get_road_path(stops_with_gps):
    """
    Get actual road geometry between consecutive GPS stops.
    Returns list of [lat, lng] waypoints that follow real roads.
    """
    gps_stops = [s for s in stops_with_gps if s['has_gps']]
    if len(gps_stops) < 2:
        return None
    
    # Build coordinate string for OSRM (lng,lat format!)
    coords = ";".join(f"{s['lng']},{s['lat']}" for s in gps_stops)
    url = f"{OSRM_BASE}/{coords}?overview=full&geometries=geojson&steps=false"
    
    try:
        resp = requests.get(url, timeout=10)
        data = resp.json()
        if data.get('code') == 'Ok':
            coords_list = data['routes'][0]['geometry']['coordinates']
            # OSRM returns [lng, lat], we need [lat, lng] for Leaflet
            return [[c[1], c[0]] for c in coords_list]
    except:
        pass
    return None

# Get road paths for your 63 best GPS-linked routes from routedata.csv
# Build road_paths.json — this is your animation backbone
road_paths = {}

priority_routes = list(routes_enriched.keys())[:63]  # start with best coverage

for i, route_id in enumerate(priority_routes):
    route = routes_enriched[route_id]
    path = get_road_path(route['stops'])
    if path:
        road_paths[str(route_id)] = path
    time.sleep(0.3)  # respect OSRM rate limits
    if i % 10 == 0:
        print(f"Processed {i}/{len(priority_routes)} routes...")

with open('data/road_paths.json', 'w') as f:
    json.dump(road_paths, f)

print(f"Road paths generated: {len(road_paths)} routes")

# ─────────────────────────────────────────
# GENERATE SYNTHETIC BUS POSITIONS
# Simulate buses spread across routes at realistic distances
# ─────────────────────────────────────────
import random
from datetime import datetime, timedelta

buses = []
bus_counter = 1000

for route_id, path_coords in road_paths.items():
    route = routes_enriched.get(route_id, {})
    stops = route.get('stops', [])
    if not path_coords or len(path_coords) < 5:
        continue
    
    # Number of buses on this route: based on route length
    n_buses = max(2, min(6, len(stops) // 4))
    
    for b in range(n_buses):
        # Spread buses at different progress points along route
        progress = b / n_buses  # 0.0 to 1.0 along the route
        path_idx = int(progress * (len(path_coords) - 1))
        pos = path_coords[path_idx]
        
        # Realistic speed: 8-25 km/h (Chennai traffic)
        speed = random.uniform(8, 25)
        
        # Occupancy based on time of day simulation
        hour = datetime.now().hour
        if 7 <= hour <= 10 or 17 <= hour <= 21:
            # Peak hours
            occupancy = random.randint(60, 115)
        else:
            occupancy = random.randint(20, 65)
        
        # Delay: more in peak hours
        delay_min = 0
        if 7 <= hour <= 10 or 17 <= hour <= 21:
            delay_min = random.choice([0, 0, 0, 3, 5, 8, 12, 18])
        else:
            delay_min = random.choice([0, 0, 2, 4])
        
        status = 'normal'
        if occupancy > 100:
            status = 'overloaded'
        elif delay_min > 8:
            status = 'delayed'
        elif occupancy > 75:
            status = 'crowded'
        
        buses.append({
            'bus_id': f'MTC-{bus_counter}',
            'route_id': str(route_id),
            'lat': pos[0],
            'lng': pos[1],
            'path_index': path_idx,
            'path_total': len(path_coords),
            'speed_kmph': round(speed, 1),
            'occupancy': occupancy,
            'delay_min': delay_min,
            'status': status,
            'direction': 'outbound' if b % 2 == 0 else 'inbound',
            'last_updated': datetime.now().isoformat()
        })
        bus_counter += 1

# Save bus positions
with open('data/bus_positions.json', 'w') as f:
    json.dump(buses, f, indent=2)

print(f"Generated {len(buses)} simulated buses across {len(road_paths)} routes")
print("Data pipeline complete!")
print()
print("Output files:")
print("  data/routes_gps_enriched.json  — GPS-enriched route stops")
print("  data/road_paths.json           — OSRM road geometry per route")
print("  data/bus_positions.json        — Simulated bus positions")
```

---

## STEP 2 — BACKEND API (`backend/main.py`)

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import json
import math
import random
from datetime import datetime

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Load pre-processed data
with open("../data/road_paths.json") as f:
    ROAD_PATHS = json.load(f)
with open("../data/routes_gps_enriched.json") as f:
    ROUTES = json.load(f)
with open("../data/bus_positions.json") as f:
    BUSES = json.load(f)

# ── In-memory bus state (advances each API call) ──
bus_state = {b['bus_id']: dict(b) for b in BUSES}

def advance_bus(bus):
    """Move bus forward along its road path realistically."""
    route_id = str(bus['route_id'])
    path = ROAD_PATHS.get(route_id, [])
    if not path:
        return bus
    
    # Advance path_index based on speed
    # Each path point is ~30-80m apart on OSRM output
    # At 15 km/h, bus moves ~4m/sec → advances ~1 point every 10 calls
    speed = bus.get('speed_kmph', 15)
    advance_prob = speed / 150  # faster bus = more likely to advance
    
    if random.random() < advance_prob:
        direction = 1 if bus['direction'] == 'outbound' else -1
        new_idx = bus['path_index'] + direction
        
        # Reverse direction at endpoints
        if new_idx >= len(path) - 1:
            bus['direction'] = 'inbound'
            new_idx = len(path) - 2
        elif new_idx <= 0:
            bus['direction'] = 'outbound'
            new_idx = 1
        
        bus['path_index'] = new_idx
        bus['lat'] = path[new_idx][0]
        bus['lng'] = path[new_idx][1]
    
    # Random small speed variation (traffic simulation)
    bus['speed_kmph'] = round(max(3, min(35, bus['speed_kmph'] + random.uniform(-2, 2))), 1)
    bus['last_updated'] = datetime.now().isoformat()
    return bus

@app.get("/api/buses")
def get_buses():
    """Returns all bus positions, advancing them each call."""
    for bus_id in bus_state:
        bus_state[bus_id] = advance_bus(bus_state[bus_id])
    return list(bus_state.values())

@app.get("/api/buses/{bus_id}/path")
def get_bus_path(bus_id: str):
    """Returns the upcoming road path for a specific bus (for animation)."""
    bus = bus_state.get(bus_id)
    if not bus:
        return {"error": "Bus not found"}
    path = ROAD_PATHS.get(str(bus['route_id']), [])
    idx = bus['path_index']
    # Return next 50 road points ahead of bus
    upcoming = path[idx:idx+50] if bus['direction'] == 'outbound' else path[max(0,idx-50):idx][::-1]
    return {"bus_id": bus_id, "upcoming_path": upcoming, "total_path": path}

@app.get("/api/routes")
def get_routes():
    return [{"route_id": k, "stops": v['stops'], "stop_count": v['stop_count'],
             "gps_coverage_pct": v['gps_coverage_pct']} for k,v in ROUTES.items()]

@app.get("/api/routes/{route_id}/path")
def get_route_path(route_id: str):
    return {"route_id": route_id, "path": ROAD_PATHS.get(route_id, [])}

@app.get("/api/routes/{route_id}/buses")
def get_buses_on_route(route_id: str):
    return [b for b in bus_state.values() if str(b['route_id']) == route_id]

@app.get("/api/stops")
def get_stops():
    """Returns all stops that have GPS coordinates."""
    stops = {}
    for route in ROUTES.values():
        for stop in route['stops']:
            if stop['has_gps'] and stop['name'] not in stops:
                stops[stop['name']] = {
                    'name': stop['name'],
                    'lat': stop['lat'],
                    'lng': stop['lng'],
                    'routes': []
                }
            if stop['has_gps']:
                if route['route_id'] not in stops[stop['name']]['routes']:
                    stops[stop['name']]['routes'].append(route['route_id'])
    return list(stops.values())

@app.get("/api/stops/{stop_name}/arrivals")
def get_stop_arrivals(stop_name: str):
    """Predict bus arrivals at a stop — Chalo-style ETA."""
    stop_name_upper = stop_name.upper()
    arrivals = []
    
    for route in ROUTES.values():
        for stop in route['stops']:
            if stop['name'] == stop_name_upper and stop['has_gps']:
                # Find buses on this route
                route_buses = [b for b in bus_state.values() 
                               if str(b['route_id']) == route['route_id']]
                for bus in route_buses:
                    # Estimate ETA based on distance and speed
                    if bus['lat'] and bus['lng']:
                        dist_km = haversine(bus['lat'], bus['lng'], stop['lat'], stop['lng'])
                        speed = max(5, bus.get('speed_kmph', 15))
                        eta_min = round((dist_km / speed) * 60)
                        if eta_min < 60:  # only show buses within 1 hour
                            arrivals.append({
                                'bus_id': bus['bus_id'],
                                'route_id': bus['route_id'],
                                'eta_min': eta_min,
                                'occupancy': bus['occupancy'],
                                'status': bus['status'],
                                'distance_km': round(dist_km, 2)
                            })
    
    arrivals.sort(key=lambda x: x['eta_min'])
    return arrivals[:5]  # top 5 upcoming buses

def haversine(lat1, lng1, lat2, lng2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng/2)**2
    return R * 2 * math.asin(math.sqrt(a))

@app.get("/api/search")
def search(q: str):
    """Search stops and routes — for search bar."""
    q_upper = q.upper()
    results = {'stops': [], 'routes': []}
    
    for route in ROUTES.values():
        if q_upper in str(route['route_id']).upper():
            results['routes'].append({'route_id': route['route_id'], 'stop_count': route['stop_count']})
        for stop in route['stops']:
            if stop['has_gps'] and q_upper in stop['name']:
                if not any(r['name'] == stop['name'] for r in results['stops']):
                    results['stops'].append({'name': stop['name'], 'lat': stop['lat'], 'lng': stop['lng']})
    
    results['stops'] = results['stops'][:8]
    results['routes'] = results['routes'][:5]
    return results
```

---

## STEP 3 — FRONTEND MAP WITH CHALO-STYLE BUS TRACKING

### `frontend/src/App.jsx` — Main app shell

```jsx
import { useState, useEffect } from 'react'
import MapView from './components/MapView'
import TrackingPanel from './components/TrackingPanel'
import SearchBar from './components/SearchBar'
import StopArrivalBoard from './components/StopArrivalBoard'
import BottomSheet from './components/BottomSheet'

export default function App() {
  const [selectedBus, setSelectedBus] = useState(null)
  const [selectedStop, setSelectedStop] = useState(null)
  const [selectedRoute, setSelectedRoute] = useState(null)
  const [view, setView] = useState('map') // 'map' | 'arrivals' | 'route'

  return (
    <div className="relative w-full h-screen bg-gray-950 overflow-hidden">
      {/* Full-screen map */}
      <MapView
        selectedBus={selectedBus}
        selectedStop={selectedStop}
        selectedRoute={selectedRoute}
        onBusClick={setSelectedBus}
        onStopClick={(stop) => { setSelectedStop(stop); setView('arrivals') }}
        onRouteClick={(route) => { setSelectedRoute(route); setView('route') }}
      />
      
      {/* Top search bar overlay */}
      <div className="absolute top-4 left-4 right-4 z-[1000]">
        <SearchBar
          onSelectStop={(stop) => { setSelectedStop(stop); setView('arrivals') }}
          onSelectRoute={(route) => { setSelectedRoute(route); setView('route') }}
        />
      </div>
      
      {/* Bottom sheet — slides up when bus/stop selected */}
      <BottomSheet isOpen={view !== 'map'} onClose={() => setView('map')}>
        {view === 'arrivals' && selectedStop && (
          <StopArrivalBoard stop={selectedStop} />
        )}
        {view === 'route' && selectedRoute && (
          <TrackingPanel route={selectedRoute} onBusSelect={setSelectedBus} />
        )}
      </BottomSheet>
      
      {/* Floating bus info card (when bus tapped) */}
      {selectedBus && (
        <BusInfoCard bus={selectedBus} onClose={() => setSelectedBus(null)} />
      )}
    </div>
  )
}
```

---

### `frontend/src/components/MapView.jsx` — The core map

This is the most important component. Build it exactly as specified.

```jsx
import { useEffect, useRef, useState, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// ── Bus icon factory ──────────────────────────────────────────────────────────
function createBusIcon(status, routeId, isSelected = false) {
  const colors = {
    normal: '#22C55E',    // green
    crowded: '#F59E0B',   // amber
    delayed: '#EF4444',   // red
    overloaded: '#DC2626' // deep red
  }
  const color = colors[status] || colors.normal
  const size = isSelected ? 36 : 28
  const pulse = (status === 'delayed' || status === 'overloaded') ? `
    <circle cx="14" cy="14" r="13" fill="${color}" opacity="0.3">
      <animate attributeName="r" from="13" to="20" dur="1.5s" repeatCount="indefinite"/>
      <animate attributeName="opacity" from="0.3" to="0" dur="1.5s" repeatCount="indefinite"/>
    </circle>
  ` : ''
  
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 28 28">
      ${pulse}
      <circle cx="14" cy="14" r="12" fill="${color}" stroke="white" stroke-width="2"/>
      <text x="14" y="11" text-anchor="middle" fill="white" 
            font-size="5" font-weight="bold" font-family="monospace">
        ${String(routeId).substring(0,4)}
      </text>
      <text x="14" y="18" text-anchor="middle" fill="white" font-size="7">🚌</text>
    </svg>`
  
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size/2, size/2]
  })
}

// ── Stop icon ──────────────────────────────────────────────────────────────────
function createStopIcon(isHighlighted = false) {
  const color = isHighlighted ? '#3B82F6' : '#64748B'
  return L.divIcon({
    html: `<div style="width:10px;height:10px;border-radius:50%;
                background:${color};border:2px solid white;
                box-shadow:0 0 4px rgba(0,0,0,0.4)"></div>`,
    className: '',
    iconSize: [10, 10],
    iconAnchor: [5, 5]
  })
}

// ── Interpolation helper: smooth bus movement between GPS points ──────────────
function interpolatePosition(from, to, fraction) {
  return [
    from[0] + (to[0] - from[0]) * fraction,
    from[1] + (to[1] - from[1]) * fraction
  ]
}

// ── Main Map Component ─────────────────────────────────────────────────────────
export default function MapView({ selectedBus, selectedStop, selectedRoute,
                                   onBusClick, onStopClick, onRouteClick }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const busMarkersRef = useRef({})        // bus_id → L.Marker
  const busAnimStatesRef = useRef({})     // bus_id → { from, to, progress, speed }
  const routeLayersRef = useRef({})       // route_id → L.Polyline
  const stopMarkersRef = useRef([])
  const animFrameRef = useRef(null)
  const lastFetchRef = useRef(0)
  const busDataRef = useRef([])           // latest bus data from API
  
  const API = 'http://localhost:8000'

  // ── Initialize Leaflet map ──────────────────────────────────────────────────
  useEffect(() => {
    if (mapInstanceRef.current) return
    
    const map = L.map(mapRef.current, {
      center: [13.0827, 80.2707],  // Chennai center
      zoom: 12,
      zoomControl: false,
      attributionControl: false
    })
    
    // Map tiles — use CartoDB dark theme for command center look
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors © CARTO'
    }).addTo(map)
    
    // Custom zoom control (bottom right)
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    
    mapInstanceRef.current = map
    
    // Load route polylines
    loadAllRoutePaths()
    
    // Load stop markers
    loadStops()
    
    // Start bus data fetch loop
    startBusLoop()
    
    // Start smooth animation loop
    startAnimationLoop()
    
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  // ── Load and draw all route polylines ──────────────────────────────────────
  const loadAllRoutePaths = async () => {
    const routes = await fetch(`${API}/api/routes`).then(r => r.json())
    
    // Color palette for routes
    const routeColors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
      '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
    ]
    
    for (const [i, route] of routes.slice(0, 63).entries()) {
      const pathData = await fetch(`${API}/api/routes/${route.route_id}/path`)
                              .then(r => r.json())
      
      if (pathData.path && pathData.path.length > 1) {
        const color = routeColors[i % routeColors.length]
        const line = L.polyline(pathData.path, {
          color: color,
          weight: 2.5,
          opacity: 0.5,
          smoothFactor: 1
        }).addTo(mapInstanceRef.current)
        
        line.on('click', () => onRouteClick(route))
        routeLayersRef.current[route.route_id] = { line, color }
      }
    }
  }

  // ── Load stop markers ───────────────────────────────────────────────────────
  const loadStops = async () => {
    const stops = await fetch(`${API}/api/stops`).then(r => r.json())
    
    stops.forEach(stop => {
      const marker = L.marker([stop.lat, stop.lng], {
        icon: createStopIcon(false),
        zIndexOffset: 100
      })
      .addTo(mapInstanceRef.current)
      .on('click', () => onStopClick(stop))
      
      // Tooltip showing stop name + route count
      marker.bindTooltip(`
        <div class="stop-tooltip">
          <strong>${stop.name}</strong><br/>
          ${stop.routes.length} routes pass here
        </div>
      `, { permanent: false, className: 'stop-tooltip-container' })
      
      stopMarkersRef.current.push({ marker, stop })
    })
  }

  // ── Fetch bus data every 3 seconds ─────────────────────────────────────────
  const startBusLoop = () => {
    const fetchBuses = async () => {
      const buses = await fetch(`${API}/api/buses`).then(r => r.json()).catch(() => [])
      
      buses.forEach(bus => {
        const prev = busDataRef.current.find(b => b.bus_id === bus.bus_id)
        
        if (prev && prev.lat && prev.lng && bus.lat && bus.lng) {
          // Set up smooth interpolation from previous to new position
          busAnimStatesRef.current[bus.bus_id] = {
            from: [prev.lat, prev.lng],
            to: [bus.lat, bus.lng],
            progress: 0,
            // Normalize speed: faster bus = faster animation
            stepSize: Math.min(0.08, bus.speed_kmph / 200)
          }
        }
      })
      
      busDataRef.current = buses
    }
    
    fetchBuses()
    const interval = setInterval(fetchBuses, 3000)
    return () => clearInterval(interval)
  }

  // ── requestAnimationFrame loop: smooth bus movement ────────────────────────
  // This is the key to smooth, realistic movement like Chalo/Ola Maps
  const startAnimationLoop = () => {
    const animate = () => {
      const map = mapInstanceRef.current
      if (!map) { animFrameRef.current = requestAnimationFrame(animate); return }
      
      busDataRef.current.forEach(bus => {
        const animState = busAnimStatesRef.current[bus.bus_id]
        let currentPos = [bus.lat, bus.lng]
        
        // Interpolate position smoothly between last known and new position
        if (animState && animState.progress < 1) {
          animState.progress = Math.min(1, animState.progress + animState.stepSize)
          currentPos = interpolatePosition(animState.from, animState.to, animState.progress)
        }
        
        const isSelected = selectedBus?.bus_id === bus.bus_id
        const icon = createBusIcon(bus.status, bus.route_id, isSelected)
        
        if (!busMarkersRef.current[bus.bus_id]) {
          // Create new marker
          const marker = L.marker(currentPos, { icon, zIndexOffset: 1000 })
            .addTo(map)
            .on('click', () => onBusClick(bus))
          
          // Popup with bus info
          marker.bindPopup(`
            <div style="min-width:160px">
              <div style="font-weight:bold;font-size:14px">🚌 Bus ${bus.bus_id}</div>
              <div>Route: <b>${bus.route_id}</b></div>
              <div>Speed: ${bus.speed_kmph} km/h</div>
              <div>Occupancy: ${bus.occupancy}%</div>
              <div>Status: <span style="color:${bus.status==='normal'?'green':'red'}">${bus.status}</span></div>
              ${bus.delay_min > 0 ? `<div style="color:red">Delayed: ${bus.delay_min} min</div>` : ''}
            </div>
          `)
          
          busMarkersRef.current[bus.bus_id] = marker
        } else {
          // Smoothly move existing marker
          busMarkersRef.current[bus.bus_id].setLatLng(currentPos)
          busMarkersRef.current[bus.bus_id].setIcon(icon)
        }
      })
      
      animFrameRef.current = requestAnimationFrame(animate)
    }
    
    animFrameRef.current = requestAnimationFrame(animate)
  }

  // ── React to selected bus: zoom to it, highlight its route ─────────────────
  useEffect(() => {
    if (!selectedBus || !mapInstanceRef.current) return
    
    const marker = busMarkersRef.current[selectedBus.bus_id]
    if (marker) {
      mapInstanceRef.current.flyTo(marker.getLatLng(), 15, { duration: 1.2 })
      marker.openPopup()
    }
    
    // Highlight the bus's route polyline
    Object.entries(routeLayersRef.current).forEach(([rid, { line }]) => {
      if (rid === String(selectedBus.route_id)) {
        line.setStyle({ weight: 5, opacity: 1 })
      } else {
        line.setStyle({ weight: 2.5, opacity: 0.3 })
      }
    })
  }, [selectedBus])

  // ── React to selected stop: zoom to it ─────────────────────────────────────
  useEffect(() => {
    if (!selectedStop || !mapInstanceRef.current) return
    mapInstanceRef.current.flyTo([selectedStop.lat, selectedStop.lng], 16, { duration: 1.0 })
  }, [selectedStop])

  return (
    <div
      ref={mapRef}
      className="w-full h-full"
      style={{ background: '#0f172a' }}
    />
  )
}
```

---

### `frontend/src/components/StopArrivalBoard.jsx`
### (Chalo-style: shows buses arriving at a stop)

```jsx
import { useState, useEffect } from 'react'

const OCCUPANCY_COLORS = {
  low: { bar: 'bg-green-500', label: 'text-green-400', text: 'Seats available' },
  medium: { bar: 'bg-yellow-500', label: 'text-yellow-400', text: 'Moderate crowd' },
  high: { bar: 'bg-orange-500', label: 'text-orange-400', text: 'Crowded' },
  full: { bar: 'bg-red-500', label: 'text-red-400', text: 'Very crowded' }
}

function getOccupancyLevel(pct) {
  if (pct < 40) return 'low'
  if (pct < 70) return 'medium'
  if (pct < 90) return 'high'
  return 'full'
}

export default function StopArrivalBoard({ stop }) {
  const [arrivals, setArrivals] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const fetchArrivals = async () => {
    const data = await fetch(
      `http://localhost:8000/api/stops/${encodeURIComponent(stop.name)}/arrivals`
    ).then(r => r.json()).catch(() => [])
    setArrivals(data)
    setLoading(false)
    setLastRefresh(new Date())
  }

  useEffect(() => {
    fetchArrivals()
    const interval = setInterval(fetchArrivals, 15000)
    return () => clearInterval(interval)
  }, [stop.name])

  return (
    <div className="bg-gray-900 text-white p-4 rounded-t-2xl min-h-64">
      {/* Stop header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-xs text-blue-400 uppercase tracking-widest">Bus Stop</span>
          </div>
          <h2 className="text-xl font-bold mt-1">{stop.name}</h2>
          <p className="text-gray-400 text-sm">{stop.routes?.length || 0} routes • {stop.lat?.toFixed(4)}, {stop.lng?.toFixed(4)}</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">Updated</div>
          <div className="text-xs text-gray-400">{lastRefresh.toLocaleTimeString()}</div>
        </div>
      </div>

      {/* Arrival list */}
      {loading ? (
        <div className="flex items-center justify-center h-32 text-gray-500">
          <div className="animate-spin mr-2">⟳</div> Fetching buses...
        </div>
      ) : arrivals.length === 0 ? (
        <div className="text-gray-500 text-center py-8">No buses tracked nearby</div>
      ) : (
        <div className="space-y-3">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Upcoming Arrivals</div>
          {arrivals.map((arrival, i) => {
            const level = getOccupancyLevel(arrival.occupancy)
            const occ = OCCUPANCY_COLORS[level]
            return (
              <div key={arrival.bus_id}
                   className={`bg-gray-800 rounded-xl p-3 border ${i === 0 ? 'border-blue-500/50' : 'border-gray-700'}`}>
                <div className="flex items-center justify-between">
                  {/* Route + Bus ID */}
                  <div className="flex items-center gap-3">
                    <div className="bg-yellow-500 text-black font-bold text-sm px-2 py-1 rounded-lg min-w-12 text-center">
                      {arrival.route_id}
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">{arrival.bus_id}</div>
                      <div className={`text-xs font-medium ${occ.label}`}>{occ.text}</div>
                    </div>
                  </div>
                  
                  {/* ETA */}
                  <div className="text-right">
                    {arrival.eta_min === 0 ? (
                      <div className="text-green-400 font-bold text-lg">At stop</div>
                    ) : (
                      <>
                        <div className={`font-bold text-2xl ${i === 0 ? 'text-white' : 'text-gray-300'}`}>
                          {arrival.eta_min}
                        </div>
                        <div className="text-gray-500 text-xs">min away</div>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Occupancy bar */}
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 bg-gray-700 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full ${occ.bar} transition-all duration-500`}
                         style={{ width: `${Math.min(100, arrival.occupancy)}%` }} />
                  </div>
                  <span className="text-xs text-gray-500">{arrival.occupancy}%</span>
                </div>
                
                {/* Distance + delay */}
                <div className="flex gap-3 mt-1">
                  <span className="text-xs text-gray-500">📍 {arrival.distance_km} km away</span>
                  {arrival.status !== 'normal' && (
                    <span className="text-xs text-red-400">⚠ {arrival.status}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
      
      {/* Tamil text — bilingual like Chennai apps */}
      <div className="mt-4 pt-3 border-t border-gray-800 text-center">
        <p className="text-xs text-gray-600">
          அடுத்த பேருந்து தகவல் • Next bus information
        </p>
      </div>
    </div>
  )
}
```

---

### `frontend/src/components/SearchBar.jsx` — Live search

```jsx
import { useState, useEffect, useRef } from 'react'

export default function SearchBar({ onSelectStop, onSelectRoute }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState({ stops: [], routes: [] })
  const [isOpen, setIsOpen] = useState(false)
  const debounceRef = useRef(null)

  useEffect(() => {
    if (!query.trim()) { setIsOpen(false); return }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const data = await fetch(
        `http://localhost:8000/api/search?q=${encodeURIComponent(query)}`
      ).then(r => r.json()).catch(() => ({ stops: [], routes: [] }))
      setResults(data)
      setIsOpen(true)
    }, 300)
  }, [query])

  return (
    <div className="relative">
      <div className="bg-gray-900/95 backdrop-blur-md rounded-2xl border border-gray-700 
                      flex items-center px-4 py-3 gap-3 shadow-2xl">
        <span className="text-gray-400 text-lg">🔍</span>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search stops or bus routes..."
          className="bg-transparent text-white placeholder-gray-500 outline-none flex-1 text-sm"
        />
        {query && (
          <button onClick={() => { setQuery(''); setIsOpen(false) }}
                  className="text-gray-500 hover:text-white">✕</button>
        )}
      </div>
      
      {isOpen && (results.stops.length > 0 || results.routes.length > 0) && (
        <div className="absolute top-full mt-2 w-full bg-gray-900/98 backdrop-blur-md 
                        rounded-2xl border border-gray-700 shadow-2xl overflow-hidden z-50">
          {results.routes.length > 0 && (
            <div>
              <div className="px-4 py-2 text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
                Routes
              </div>
              {results.routes.map(route => (
                <button key={route.route_id}
                        onClick={() => { onSelectRoute(route); setIsOpen(false); setQuery('') }}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-800 text-left">
                  <span className="bg-yellow-500 text-black font-bold text-xs px-2 py-0.5 rounded">
                    {route.route_id}
                  </span>
                  <span className="text-gray-300 text-sm">{route.stop_count} stops</span>
                </button>
              ))}
            </div>
          )}
          {results.stops.length > 0 && (
            <div>
              <div className="px-4 py-2 text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
                Bus Stops
              </div>
              {results.stops.map(stop => (
                <button key={stop.name}
                        onClick={() => { onSelectStop(stop); setIsOpen(false); setQuery('') }}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-800 text-left">
                  <span className="text-blue-400">🚏</span>
                  <div>
                    <div className="text-gray-200 text-sm">{stop.name}</div>
                    <div className="text-gray-500 text-xs">{stop.lat?.toFixed(4)}, {stop.lng?.toFixed(4)}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

---

### `frontend/src/components/BottomSheet.jsx` — Slides up from bottom

```jsx
import { useEffect, useRef } from 'react'

export default function BottomSheet({ isOpen, onClose, children }) {
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/30 z-[800] backdrop-blur-sm"
             onClick={onClose} />
      )}
      
      {/* Sheet */}
      <div className={`fixed bottom-0 left-0 right-0 z-[900] 
                       bg-gray-900 rounded-t-3xl shadow-2xl
                       transform transition-transform duration-300 ease-out
                       max-h-[70vh] overflow-y-auto
                       ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}>
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-700 rounded-full" />
        </div>
        {children}
      </div>
    </>
  )
}
```

---

### `frontend/src/components/BusInfoCard.jsx` — Floating bus detail card

```jsx
export default function BusInfoCard({ bus, onClose }) {
  const statusConfig = {
    normal: { color: 'text-green-400', bg: 'bg-green-900/30', label: 'On time' },
    crowded: { color: 'text-yellow-400', bg: 'bg-yellow-900/30', label: 'Crowded' },
    delayed: { color: 'text-red-400', bg: 'bg-red-900/30', label: `Delayed ${bus.delay_min} min` },
    overloaded: { color: 'text-red-400', bg: 'bg-red-900/30', label: 'Overloaded' }
  }
  const s = statusConfig[bus.status] || statusConfig.normal
  
  return (
    <div className="absolute bottom-24 left-4 right-4 z-[1000]
                    bg-gray-900/98 backdrop-blur-lg rounded-2xl 
                    border border-gray-700 shadow-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-500 rounded-xl flex items-center justify-center text-xl">
            🚌
          </div>
          <div>
            <div className="font-bold text-white">{bus.bus_id}</div>
            <div className="text-gray-400 text-sm">Route {bus.route_id}</div>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">✕</button>
      </div>
      
      <div className={`${s.bg} rounded-xl px-3 py-2 mb-3 flex items-center gap-2`}>
        <span className={`${s.color} font-medium text-sm`}>● {s.label}</span>
      </div>
      
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-800 rounded-xl p-2 text-center">
          <div className="text-white font-bold">{bus.speed_kmph}</div>
          <div className="text-gray-500 text-xs">km/h</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-2 text-center">
          <div className="text-white font-bold">{bus.occupancy}%</div>
          <div className="text-gray-500 text-xs">occupancy</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-2 text-center">
          <div className="text-white font-bold capitalize">{bus.direction}</div>
          <div className="text-gray-500 text-xs">direction</div>
        </div>
      </div>
    </div>
  )
}
```

---

## STEP 4 — PROJECT STRUCTURE & SETUP

```
/ubocc-tracker/
├── data/
│   ├── route_detail.csv          ← YOUR FILE (from archive.zip)
│   ├── stopdata.csv              ← YOUR FILE (from archive__1_.zip)
│   ├── routedata.csv             ← YOUR FILE (from archive__1_.zip)
│   ├── routes_gps_enriched.json  ← GENERATED by enrich_data.py
│   ├── road_paths.json           ← GENERATED by enrich_data.py (OSRM)
│   └── bus_positions.json        ← GENERATED by enrich_data.py
├── scripts/
│   └── enrich_data.py            ← Run this first
├── backend/
│   ├── main.py
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   └── components/
    │       ├── MapView.jsx
    │       ├── SearchBar.jsx
    │       ├── StopArrivalBoard.jsx
    │       ├── BottomSheet.jsx
    │       ├── BusInfoCard.jsx
    │       └── TrackingPanel.jsx
    ├── package.json
    └── vite.config.js
```

### `backend/requirements.txt`
```
fastapi
uvicorn
pandas
requests
difflib2
```

### `frontend/package.json` dependencies
```json
{
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "leaflet": "^1.9.4",
    "axios": "^1.6.0",
    "zustand": "^4.5.0",
    "recharts": "^2.10.0"
  }
}
```

---

## STEP 5 — RUN IN 4 STEPS

```bash
# Step 1: Data pipeline (run ONCE — takes ~5 min for OSRM calls)
cd scripts
pip install pandas requests
python enrich_data.py

# Step 2: Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Step 3: Frontend
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173

# Step 4: Open http://localhost:5173
# You should see: Chennai map + moving buses on real roads
```

---

## ANIMATION QUALITY CHECKLIST

Build each of these before calling it done:

- [ ] Buses move **smoothly** along road paths (no teleporting)
- [ ] Buses slow down near stop areas (reduce `stepSize` near stops)
- [ ] **Color coding**: green=normal, amber=crowded, red=delayed/overloaded
- [ ] **Pulsing ring** around delayed/overloaded buses
- [ ] Route polylines drawn on actual road geometry (from OSRM), not straight lines
- [ ] Tap a bus → zoom to it + highlight its route + show info card
- [ ] Tap a stop → bottom sheet slides up with Chalo-style ETA board
- [ ] Search bar autocompletes stop names from your 1,280 GPS stops
- [ ] **Dark map tiles** (CartoDB Dark Matter) — looks like Ola Maps / Chalo
- [ ] Tamil + English text on arrival board

---

## DATA QUALITY NOTES (IMPORTANT — tell the AI)

Your dataset has these known characteristics:

1. **`route_detail.csv`**: 606 routes × 8,223 records — but `stop_id` is
   **sequential per route** (1, 2, 3...), NOT a global stop ID.
   You cannot join it directly to `stopdata.csv` by stop_id.
   **Match by stop name (with fuzzy matching).**

2. **`stopdata.csv`**: 1,280 stops with GPS — but only ~214 names match
   `route_detail` directly. Use `difflib.get_close_matches(cutoff=0.75)`
   to get fuzzy matches. This raises coverage to ~60-70%.

3. **`routedata.csv`**: 63 routes with stop_id sequences that DO use
   `stopdata.csv` Stop_id values. These 63 routes are your **highest
   confidence GPS routes** — use them for the primary demo.

4. **Broadway** is served by 138 routes. **M.G.R. Central** by 113.
   **Saidapet** by 95. These are your top hubs — always show them.

5. OSRM public API: `http://router.project-osrm.org/route/v1/driving/`
   — free, no key, handles up to 100 coordinates per request.
   **Rate limit**: 1 request per second. Build in `time.sleep(0.3)`.

---

## WHAT THIS WILL LOOK LIKE WHEN DONE

- **Dark Chennai map** with colored route lines following real roads
- **Hundreds of animated bus dots** moving smoothly along routes
- **Pulsing red dots** at overloaded buses
- **Tap any bus** → floating card with speed, occupancy, route, status
- **Tap any stop** → bottom sheet slides up showing:
  - Next 5 buses with ETA countdown
  - Occupancy level bars (like Chalo app)
  - Tamil + English labels
- **Search bar** at top — type "BROADWAY" → all buses passing through,
  type "23C" → see that route highlighted on map
- **Smooth, continuous animation** — not jarky position jumps

This is the upgrade from static matplotlib network graph → 
Chalo/Chennai One style live tracking app.
