import json
import os
import random
from database import engine, SessionLocal, Base
from models import Depot, Route, Stop, RouteShape, Bus, Event

Base.metadata.create_all(bind=engine)

DATA_DIR = "../../ubocc/data"
DEPOTS = [
    {"depot_id": "D1", "name": "Broadway", "lat": 13.0883, "lon": 80.2837},
    {"depot_id": "D2", "name": "Adyar", "lat": 13.0012, "lon": 80.2565},
    {"depot_id": "D3", "name": "Vadapalani", "lat": 13.0500, "lon": 80.2121},
    {"depot_id": "D4", "name": "Tambaram", "lat": 12.9249, "lon": 80.1100},
    {"depot_id": "D5", "name": "Anna Nagar", "lat": 13.0850, "lon": 80.2101},
]

def seed():
    db = SessionLocal()
    
    # 1. Seed Depots
    if db.query(Depot).count() == 0:
        for d in DEPOTS:
            depot = Depot(
                depot_id=d["depot_id"],
                name=d["name"],
                lat=d["lat"],
                lon=d["lon"],
                total_buses=100,
                reserve_buses=random.randint(5, 15)
            )
            db.add(depot)
        db.commit()

    # Load Data
    try:
        with open(os.path.join(DATA_DIR, "routes_gps_enriched.json")) as f:
            routes_data = json.load(f)
        with open(os.path.join(DATA_DIR, "road_paths.json")) as f:
            paths_data = json.load(f)
        with open(os.path.join(DATA_DIR, "bus_positions.json")) as f:
            buses_data = json.load(f)
    except FileNotFoundError:
        print("Data files not found in ../../ubocc/data/. Make sure to run enrich_data.py there first.")
        return

    # 2. Seed Routes and Stops
    if db.query(Route).count() == 0:
        added_stops = set()
        for route_id, route_info in routes_data.items():
            if route_id not in paths_data: continue # Only keep routes with paths
            
            db.add(Route(
                route_id=route_id,
                route_no=route_id,
                service_type=random.choice(["Ordinary", "Deluxe", "AC"]),
                depot_id=random.choice(DEPOTS)["depot_id"]
            ))
            
            for stop in route_info["stops"]:
                stop_id = str(stop["seq"]) + "_" + stop["name"]
                if stop["has_gps"] and stop["name"] not in added_stops:
                    db.add(Stop(
                        stop_id=stop["name"],
                        name=stop["name"],
                        lat=stop["lat"],
                        lon=stop["lng"]
                    ))
                    added_stops.add(stop["name"])
        db.commit()

    # 3. Seed Route Shapes
    if db.query(RouteShape).count() == 0:
        for route_id, coords in paths_data.items():
            db.add(RouteShape(
                shape_id=f"shape_{route_id}",
                route_id=route_id,
                polyline_points=json.dumps(coords)
            ))
        db.commit()

    # 4. Seed Buses
    if db.query(Bus).count() == 0:
        for b in buses_data:
            db.add(Bus(
                bus_id=b["bus_id"],
                route_id=b["route_id"],
                current_position_index=b["path_index"],
                path_total=b["path_total"],
                speed=b["speed_kmph"],
                occupancy=b["occupancy"],
                status=b["status"],
                direction=b["direction"]
            ))
        db.commit()

    # 5. Seed Events
    if db.query(Event).count() == 0:
        events = [
            Event(event_id="EVT1", type="IPL Match", location="Chepauk Stadium", demand_increase=85.0, lat=13.0628, lon=80.2793),
            Event(event_id="EVT2", type="Heavy Rain", location="Velachery", demand_increase=40.0, lat=12.9785, lon=80.2206),
        ]
        db.bulk_save_objects(events)
        db.commit()

    print("Database seeded successfully.")
    db.close()

if __name__ == "__main__":
    seed()
