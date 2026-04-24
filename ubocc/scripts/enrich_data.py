"""
scripts/enrich_data.py
Transforms route_detail.csv + stopdata.csv + routedata.csv
into animation-ready JSON for the frontend.

Run from the ubocc/ directory:
    python scripts/enrich_data.py

Output files (in data/):
    routes_gps_enriched.json  - GPS-enriched route stops
    road_paths.json           - OSRM road geometry per route
    bus_positions.json        - Simulated bus positions
"""

import os
import sys
import pandas as pd
import json
import requests
import time
import random
from difflib import get_close_matches
from datetime import datetime

# Force UTF-8 output on Windows to avoid cp1252 encoding errors
sys.stdout.reconfigure(encoding='utf-8')

# -----------------------------------------
# PATH SETUP -- works when run from ubocc/ or scripts/
# -----------------------------------------
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(SCRIPT_DIR)  # ubocc/

DATASETS_DIR = os.path.join(BASE_DIR, "datasets")
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

# archive (1) has stopdata/routedata, archive has route_detail
ARCHIVE1_DIR = os.path.join(DATASETS_DIR, "archive (1)")
ARCHIVE_DIR  = os.path.join(DATASETS_DIR, "archive")

ROUTE_DETAIL_PATH = os.path.join(ARCHIVE_DIR,  "route_detail.csv")
STOP_GPS_PATH     = os.path.join(ARCHIVE1_DIR, "stopdata.csv")
ROUTE_SEQ_PATH    = os.path.join(ARCHIVE1_DIR, "routedata.csv")

print("=" * 60)
print("Chennai U-BOCC -- Data Enrichment Pipeline")
print("=" * 60)
print("\nLooking for data files:")
print(f"  route_detail.csv : {ROUTE_DETAIL_PATH}")
print(f"  stopdata.csv     : {STOP_GPS_PATH}")
print(f"  routedata.csv    : {ROUTE_SEQ_PATH}")

for path in [ROUTE_DETAIL_PATH, STOP_GPS_PATH, ROUTE_SEQ_PATH]:
    if not os.path.exists(path):
        print(f"\n[ERROR] File not found: {path}")
        sys.exit(1)
    else:
        print(f"  [OK] {os.path.basename(path)}")

# -----------------------------------------
# LOAD DATA
# -----------------------------------------
print("\n[1/5] Loading CSV files...")

route_df     = pd.read_csv(ROUTE_DETAIL_PATH)
stop_gps_df  = pd.read_csv(STOP_GPS_PATH)
route_seq_df = pd.read_csv(ROUTE_SEQ_PATH)

# Drop any leading index column
if route_df.columns[0].startswith("Unnamed"):
    route_df = route_df.iloc[:, 1:]

print(f"  route_detail.csv : {len(route_df):,} records")
print(f"  stopdata.csv     : {len(stop_gps_df):,} stops")
print(f"  routedata.csv    : {len(route_seq_df):,} records")

# Normalize stop names
route_df['stop_name'] = route_df['stop_name'].astype(str).str.strip().str.upper()

# -----------------------------------------
# BUILD GPS LOOKUP FROM stopdata.csv
# -----------------------------------------
print("\n[2/5] Building GPS lookup from stopdata.csv...")

col_map = {}
for col in stop_gps_df.columns:
    cl = col.strip().lower()
    if cl in ('lat', 'latitude'):
        col_map['lat'] = col
    elif cl in ('lng', 'lon', 'long', 'longitude'):
        col_map['lng'] = col
    elif 'stop' in cl and 'name' in cl:
        col_map['name'] = col
    elif 'stop' in cl and 'id' in cl:
        col_map['id'] = col

print(f"  Detected columns: {col_map}")

gps_lookup = {}
for _, row in stop_gps_df.iterrows():
    lat  = float(row[col_map['lat']])  if col_map.get('lat')  else None
    lng  = float(row[col_map['lng']])  if col_map.get('lng')  else None
    name = str(row[col_map['name']]).strip().upper() if col_map.get('name') else None
    sid  = str(row[col_map['id']])     if col_map.get('id')   else None

    if lat and lng and name and (12.4 < lat < 13.5) and (79.8 < lng < 80.5):
        gps_lookup[name] = {'lat': lat, 'lng': lng, 'stop_id': sid}

print(f"  Valid GPS stops (in Chennai bbox): {len(gps_lookup)}")

# -----------------------------------------
# FUZZY MATCHING
# -----------------------------------------
_candidates = list(gps_lookup.keys())

def get_gps_for_stop(stop_name):
    """Try exact match first, then fuzzy match (cutoff=0.75)."""
    name_upper = stop_name.strip().upper()
    if name_upper in gps_lookup:
        return gps_lookup[name_upper]
    matches = get_close_matches(name_upper, _candidates, n=1, cutoff=0.75)
    if matches:
        return gps_lookup[matches[0]]
    return None

# -----------------------------------------
# BUILD GPS-ENRICHED ROUTE SEQUENCES
# -----------------------------------------
print("\n[3/5] Enriching route_detail.csv with GPS coordinates (fuzzy matching)...")

routes_enriched = {}
gps_hit = gps_miss = 0

for route_id, group in route_df.groupby('route_id'):
    stops = []
    for _, row in group.sort_values('stop_id').iterrows():
        gps = get_gps_for_stop(row['stop_name'])
        if gps:
            gps_hit += 1
        else:
            gps_miss += 1
        stops.append({
            'seq':     int(row['stop_id']),
            'name':    row['stop_name'],
            'lat':     gps['lat'] if gps else None,
            'lng':     gps['lng'] if gps else None,
            'has_gps': gps is not None
        })

    gps_count = sum(1 for s in stops if s['has_gps'])
    coverage  = gps_count / len(stops) if stops else 0

    if coverage >= 0.4:
        routes_enriched[str(route_id)] = {
            'route_id':         str(route_id),
            'stops':            stops,
            'stop_count':       len(stops),
            'gps_coverage_pct': round(coverage * 100, 1),
        }

print(f"  GPS hits: {gps_hit:,} | misses: {gps_miss:,}")
print(f"  Routes with >=40% GPS coverage: {len(routes_enriched)}")

out_path = os.path.join(DATA_DIR, 'routes_gps_enriched.json')
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(routes_enriched, f, indent=2)
print(f"  Saved -> {out_path}")

# -----------------------------------------
# OSRM ROAD SNAPPING
# -----------------------------------------
print("\n[4/5] Fetching OSRM road paths (this takes ~2-5 min)...")

OSRM_BASE = "http://router.project-osrm.org/route/v1/driving"

def get_road_path(stops_with_gps):
    """Get actual road geometry between GPS stops via public OSRM API."""
    gps_stops = [s for s in stops_with_gps if s['has_gps'] and s['lat'] and s['lng']]
    if len(gps_stops) < 2:
        return None

    # OSRM max 100 waypoints
    if len(gps_stops) > 100:
        step = len(gps_stops) // 100 + 1
        gps_stops = gps_stops[::step]

    # OSRM uses lng,lat order!
    coords = ";".join(f"{s['lng']},{s['lat']}" for s in gps_stops)
    url = f"{OSRM_BASE}/{coords}?overview=full&geometries=geojson&steps=false"

    try:
        resp = requests.get(url, timeout=15)
        data = resp.json()
        if data.get('code') == 'Ok':
            coords_list = data['routes'][0]['geometry']['coordinates']
            # OSRM returns [lng, lat] -- Leaflet needs [lat, lng]
            return [[c[1], c[0]] for c in coords_list]
    except Exception:
        pass
    return None

road_paths = {}

sorted_routes   = sorted(routes_enriched.values(),
                          key=lambda r: r['gps_coverage_pct'], reverse=True)
priority_routes = sorted_routes[:63]

for i, route in enumerate(priority_routes):
    route_id = route['route_id']
    path = get_road_path(route['stops'])
    if path:
        road_paths[route_id] = path
        status = f"[OK] {len(path)} pts"
    else:
        status = "[fallback] straight lines"
        gps_stops = [s for s in route['stops'] if s['has_gps']]
        if len(gps_stops) >= 2:
            road_paths[route_id] = [[s['lat'], s['lng']] for s in gps_stops]

    if i % 5 == 0 or i == len(priority_routes) - 1:
        print(f"  [{i+1:02d}/{len(priority_routes)}] Route {route_id}: {status}")

    time.sleep(0.35)  # respect OSRM rate limits

out_path = os.path.join(DATA_DIR, 'road_paths.json')
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(road_paths, f)
print(f"  Road paths generated: {len(road_paths)} routes")
print(f"  Saved -> {out_path}")

# -----------------------------------------
# GENERATE SYNTHETIC BUS POSITIONS
# -----------------------------------------
print("\n[5/5] Generating synthetic bus positions...")

buses = []
bus_counter = 1000
hour = datetime.now().hour

for route_id, path_coords in road_paths.items():
    route = routes_enriched.get(route_id, {})
    stops = route.get('stops', [])
    if not path_coords or len(path_coords) < 5:
        continue

    n_buses = max(2, min(6, len(stops) // 4))

    for b in range(n_buses):
        progress = b / n_buses
        path_idx = int(progress * (len(path_coords) - 1))
        pos      = path_coords[path_idx]

        speed = random.uniform(8, 25)

        if 7 <= hour <= 10 or 17 <= hour <= 21:
            occupancy = random.randint(60, 115)
        else:
            occupancy = random.randint(20, 65)

        if 7 <= hour <= 10 or 17 <= hour <= 21:
            delay_min = random.choice([0, 0, 0, 3, 5, 8, 12, 18])
        else:
            delay_min = random.choice([0, 0, 2, 4])

        if occupancy > 100:
            status = 'overloaded'
        elif delay_min > 8:
            status = 'delayed'
        elif occupancy > 75:
            status = 'crowded'
        else:
            status = 'normal'

        buses.append({
            'bus_id':       f'MTC-{bus_counter}',
            'route_id':     str(route_id),
            'lat':          pos[0],
            'lng':          pos[1],
            'path_index':   path_idx,
            'path_total':   len(path_coords),
            'speed_kmph':   round(speed, 1),
            'occupancy':    occupancy,
            'delay_min':    delay_min,
            'status':       status,
            'direction':    'outbound' if b % 2 == 0 else 'inbound',
            'last_updated': datetime.now().isoformat(),
        })
        bus_counter += 1

out_path = os.path.join(DATA_DIR, 'bus_positions.json')
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(buses, f, indent=2)

print(f"  Generated {len(buses)} buses across {len(road_paths)} routes")
print(f"  Saved -> {out_path}")

print("\n" + "=" * 60)
print("[DONE] Data pipeline complete!")
print("=" * 60)
print(f"\nOutput files in {DATA_DIR}/:")
print(f"  routes_gps_enriched.json  ({len(routes_enriched)} routes)")
print(f"  road_paths.json           ({len(road_paths)} road paths)")
print(f"  bus_positions.json        ({len(buses)} buses)")
print("\nNext: restart the backend -- uvicorn main:app --reload --port 8000")
