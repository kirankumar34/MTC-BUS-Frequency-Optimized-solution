"""Seed all CSV data into SQLite database."""
import os
import sys
import pandas as pd
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, Route, Stop, Depot, BusGPS, Incident, DispatchAction, PassengerAlert

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
DATABASE_URL = "sqlite:///./ubocc.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)

# Seed bus GPS data (15 buses, hardcoded initial positions)
SEED_BUSES = [
    {"bus_id": "MTC-2301", "route_id": "R001", "trip_id": "T013", "lat": 13.0956, "lng": 80.2876,
     "speed_kmph": 0, "occupancy_pct": 45, "delay_min": 0, "status": "at_stop",
     "heading": "South", "timestamp": "2025-04-25 17:00:00", "next_stop_id": "S002", "next_stop_eta_min": 8},
    {"bus_id": "MTC-2302", "route_id": "R001", "trip_id": "T013", "lat": 13.0650, "lng": 80.2630,
     "speed_kmph": 18, "occupancy_pct": 72, "delay_min": 3, "status": "in_transit",
     "heading": "South", "timestamp": "2025-04-25 17:00:00", "next_stop_id": "S005", "next_stop_eta_min": 22},
    {"bus_id": "MTC-2303", "route_id": "R001", "trip_id": "T013", "lat": 13.0068, "lng": 80.2206,
     "speed_kmph": 8, "occupancy_pct": 95, "delay_min": 12, "status": "delayed",
     "heading": "South", "timestamp": "2025-04-25 17:00:00", "next_stop_id": "S005", "next_stop_eta_min": 18},
    {"bus_id": "MTC-2101", "route_id": "R002", "trip_id": "T014", "lat": 13.0956, "lng": 80.2876,
     "speed_kmph": 0, "occupancy_pct": 38, "delay_min": 0, "status": "at_stop",
     "heading": "South", "timestamp": "2025-04-25 17:00:00", "next_stop_id": "S002", "next_stop_eta_min": 10},
    {"bus_id": "MTC-2102", "route_id": "R002", "trip_id": "T014", "lat": 13.0523, "lng": 80.2818,
     "speed_kmph": 5, "occupancy_pct": 88, "delay_min": 8, "status": "delayed",
     "heading": "South", "timestamp": "2025-04-25 17:00:00", "next_stop_id": "S012", "next_stop_eta_min": 6},
    {"bus_id": "MTC-4701", "route_id": "R003", "trip_id": "T005", "lat": 12.9990, "lng": 80.2716,
     "speed_kmph": 22, "occupancy_pct": 55, "delay_min": 0, "status": "in_transit",
     "heading": "North", "timestamp": "2025-04-25 17:00:00", "next_stop_id": "S015", "next_stop_eta_min": 12},
    {"bus_id": "MTC-1901", "route_id": "R004", "trip_id": "T015", "lat": 13.0044, "lng": 80.2599,
     "speed_kmph": 35, "occupancy_pct": 62, "delay_min": 0, "status": "in_transit",
     "heading": "South", "timestamp": "2025-04-25 17:00:00", "next_stop_id": "S008", "next_stop_eta_min": 8},
    {"bus_id": "MTC-1902", "route_id": "R004", "trip_id": "T015", "lat": 12.9587, "lng": 80.2415,
     "speed_kmph": 42, "occupancy_pct": 45, "delay_min": 0, "status": "in_transit",
     "heading": "South", "timestamp": "2025-04-25 17:00:00", "next_stop_id": "S030", "next_stop_eta_min": 5},
    {"bus_id": "MTC-0501", "route_id": "R005", "trip_id": "T007", "lat": 13.0068, "lng": 80.2206,
     "speed_kmph": 12, "occupancy_pct": 78, "delay_min": 5, "status": "delayed",
     "heading": "East", "timestamp": "2025-04-25 17:00:00", "next_stop_id": "S004", "next_stop_eta_min": 10},
    {"bus_id": "MTC-2901", "route_id": "R006", "trip_id": "T008", "lat": 13.0827, "lng": 80.2757,
     "speed_kmph": 0, "occupancy_pct": 55, "delay_min": 2, "status": "at_stop",
     "heading": "South", "timestamp": "2025-04-25 17:00:00", "next_stop_id": "S006", "next_stop_eta_min": 15},
    {"bus_id": "MTC-2902", "route_id": "R006", "trip_id": "T008", "lat": 12.9745, "lng": 80.2150,
     "speed_kmph": 0, "occupancy_pct": 110, "delay_min": 25, "status": "overloaded",
     "heading": "South", "timestamp": "2025-04-25 17:00:00", "next_stop_id": "S009", "next_stop_eta_min": 0},
    {"bus_id": "MTC-7001", "route_id": "R007", "trip_id": "T012", "lat": 13.0694, "lng": 80.1952,
     "speed_kmph": 30, "occupancy_pct": 42, "delay_min": 0, "status": "in_transit",
     "heading": "South", "timestamp": "2025-04-25 17:00:00", "next_stop_id": "S018", "next_stop_eta_min": 10},
    {"bus_id": "MTC-M151", "route_id": "R008", "trip_id": "T006", "lat": 13.0330, "lng": 80.2677,
     "speed_kmph": 15, "occupancy_pct": 65, "delay_min": 3, "status": "in_transit",
     "heading": "South", "timestamp": "2025-04-25 17:00:00", "next_stop_id": "S009", "next_stop_eta_min": 18},
    {"bus_id": "MTC-2701", "route_id": "R009", "trip_id": "T010", "lat": 13.0694, "lng": 80.1952,
     "speed_kmph": 25, "occupancy_pct": 71, "delay_min": 0, "status": "in_transit",
     "heading": "East", "timestamp": "2025-04-25 17:00:00", "next_stop_id": "S004", "next_stop_eta_min": 12},
    {"bus_id": "MTC-0901", "route_id": "R010", "trip_id": "T009", "lat": 13.1666, "lng": 80.3107,
     "speed_kmph": 0, "occupancy_pct": 35, "delay_min": 0, "status": "at_stop",
     "heading": "South", "timestamp": "2025-04-25 17:00:00", "next_stop_id": "S020", "next_stop_eta_min": 20},
]


def seed_all():
    Base.metadata.create_all(engine)
    db = SessionLocal()
    try:
        # Clear existing data
        for model in [Route, Stop, Depot, BusGPS, Incident, DispatchAction, PassengerAlert]:
            db.query(model).delete()
        db.commit()

        # Routes
        routes_df = pd.read_csv(os.path.join(DATA_DIR, 'routes_master.csv'))
        for _, row in routes_df.iterrows():
            db.add(Route(**row.to_dict()))

        # Stops
        stops_df = pd.read_csv(os.path.join(DATA_DIR, 'stops_master.csv'))
        for _, row in stops_df.iterrows():
            db.add(Stop(**row.to_dict()))

        # Depots
        depots_df = pd.read_csv(os.path.join(DATA_DIR, 'depots_master.csv'))
        for _, row in depots_df.iterrows():
            db.add(Depot(**row.to_dict()))

        # Bus GPS
        for bus in SEED_BUSES:
            db.add(BusGPS(**bus))

        # Incidents
        incidents_df = pd.read_csv(os.path.join(DATA_DIR, 'incidents.csv'))
        for _, row in incidents_df.iterrows():
            db.add(Incident(**row.to_dict()))

        # Dispatch Actions
        dispatch_df = pd.read_csv(os.path.join(DATA_DIR, 'dispatch_actions.csv'))
        for _, row in dispatch_df.iterrows():
            db.add(DispatchAction(**row.to_dict()))

        # Passenger Alerts
        alerts_df = pd.read_csv(os.path.join(DATA_DIR, 'passenger_alerts.csv'))
        for _, row in alerts_df.iterrows():
            db.add(PassengerAlert(**row.to_dict()))

        db.commit()
        print("[OK] Database seeded successfully!")
        print(f"   Routes: {len(routes_df)}")
        print(f"   Stops: {len(stops_df)}")
        print(f"   Depots: {len(depots_df)}")
        print(f"   Buses: {len(SEED_BUSES)}")
        print(f"   Incidents: {len(incidents_df)}")
        print(f"   Dispatch Actions: {len(dispatch_df)}")
        print(f"   Passenger Alerts: {len(alerts_df)}")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Seeding failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_all()
