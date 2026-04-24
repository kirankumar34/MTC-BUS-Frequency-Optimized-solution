"""Chennai U-BOCC FastAPI Backend — Main Application"""
import os
import math
import random
import uuid
import json
import pathlib
from datetime import datetime
from typing import Optional
from dotenv import load_dotenv

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from models import Base, Route, Stop, Depot, BusGPS, Incident, DispatchAction, PassengerAlert
import gemini_engine

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./ubocc.db")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Chennai U-BOCC API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ─── Bus movement simulation ───────────────────────────────────────────────
# Route waypoints: each route has a list of (lat, lng) checkpoints
ROUTE_WAYPOINTS = {
    "R001": [  # 23C: Broadway → Tambaram via Guindy
        (13.0956, 80.2876), (13.0827, 80.2757), (13.0770, 80.2613),
        (13.0641, 80.2501), (13.0388, 80.2323), (13.0227, 80.2202),
        (13.0068, 80.2206), (12.9893, 80.1965), (12.9673, 80.1574),
        (12.9516, 80.1417), (12.9249, 80.1000)
    ],
    "R002": [  # 21G: Broadway → Tambaram via Marina
        (13.0956, 80.2876), (13.0827, 80.2757), (13.0622, 80.2793),
        (13.0523, 80.2818), (13.0330, 80.2677), (13.0012, 80.2565),
        (12.9990, 80.2716), (12.9833, 80.2584), (12.9673, 80.1574),
        (12.9249, 80.1000)
    ],
    "R003": [  # 47B: Besant Nagar → Villivakkam
        (12.9990, 80.2716), (13.0012, 80.2565), (13.0330, 80.2677),
        (13.0388, 80.2323), (13.0503, 80.2121), (13.0600, 80.2412),
        (13.0849, 80.2101), (13.1135, 80.2117)
    ],
    "R004": [  # 19B: Adyar → Sholinganallur
        (13.0044, 80.2599), (12.9833, 80.2584), (12.9587, 80.2415),
        (12.9010, 80.2279), (12.9007, 80.2267)
    ],
    "R005": [  # 5: Guindy → T Nagar
        (13.0068, 80.2206), (13.0227, 80.2202), (13.0388, 80.2323)
    ],
    "R006": [  # 29C: Central → Velachery
        (13.0827, 80.2757), (13.0694, 80.1952), (13.0503, 80.2121),
        (13.0227, 80.2202), (13.0068, 80.2206), (12.9893, 80.1965),
        (12.9745, 80.2150), (12.9815, 80.2209)
    ],
    "R007": [  # 70: Broadway → Tambaram via Poonamallee
        (13.0956, 80.2876), (13.0694, 80.1952), (13.0503, 80.2121),
        (13.0367, 80.1574), (12.9673, 80.1574), (12.9516, 80.1417),
        (12.9249, 80.1000)
    ],
    "R008": [  # M15: Mylapore → Tambaram East
        (13.0330, 80.2677), (12.9990, 80.2716), (12.9815, 80.2209),
        (12.9745, 80.2150), (12.9211, 80.1963), (12.9249, 80.1000)
    ],
    "R009": [  # 27A: CMBT → Adyar
        (13.0694, 80.1952), (13.0849, 80.2101), (13.0600, 80.2412),
        (13.0388, 80.2323), (13.0227, 80.2202), (13.0044, 80.2599)
    ],
    "R010": [  # 9: Thiruvotriyur → Broadway
        (13.1666, 80.3107), (13.1171, 80.2494), (13.0956, 80.2876)
    ],
}

# Track bus animation state (position index along waypoints, direction)
_bus_state: dict = {}


def _init_bus_state(db: Session):
    global _bus_state
    buses = db.query(BusGPS).all()
    for bus in buses:
        if bus.bus_id not in _bus_state:
            waypoints = ROUTE_WAYPOINTS.get(bus.route_id, [(bus.lat, bus.lng)])
            _bus_state[bus.bus_id] = {
                "waypoint_idx": 0,
                "progress": random.random(),  # 0.0 to 1.0 between waypoints
                "direction": 1,  # 1 = forward, -1 = reverse
            }


def _interpolate(p1, p2, t):
    return (p1[0] + (p2[0] - p1[0]) * t, p1[1] + (p2[1] - p1[1]) * t)


def _move_bus(bus_id: str, route_id: str, current_lat: float, current_lng: float,
              status: str, delay_min: float) -> tuple:
    """Return updated (lat, lng, speed) for a bus."""
    waypoints = ROUTE_WAYPOINTS.get(route_id, [(current_lat, current_lng)])
    if len(waypoints) < 2:
        return current_lat, current_lng, 0.0

    state = _bus_state.get(bus_id, {"waypoint_idx": 0, "progress": 0.0, "direction": 1})
    idx = state["waypoint_idx"]
    progress = state["progress"]
    direction = state["direction"]

    # Speed based on status
    base_speed = 0.003 if status == "overloaded" else 0.005 if status == "delayed" else 0.008
    noise = random.uniform(-0.001, 0.001)
    step = max(0.002, base_speed + noise)

    progress += step
    if progress >= 1.0:
        progress = 0.0
        idx += direction
        if idx >= len(waypoints) - 1:
            idx = len(waypoints) - 2
            direction = -1
        elif idx < 0:
            idx = 1
            direction = 1

    _bus_state[bus_id] = {"waypoint_idx": idx, "progress": progress, "direction": direction}

    p1 = waypoints[idx]
    p2 = waypoints[min(idx + 1, len(waypoints) - 1)]
    lat, lng = _interpolate(p1, p2, progress)

    # Add small GPS noise
    lat += random.uniform(-0.0002, 0.0002)
    lng += random.uniform(-0.0002, 0.0002)

    speed = random.uniform(5, 45) if status not in ["at_stop", "overloaded"] else random.uniform(0, 8)
    return lat, lng, round(speed, 1)


# ─── KPI state (mutable for demo scenario) ─────────────────────────────────
_kpi_override: dict = {}


# ─── API Routes ─────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "Chennai U-BOCC API v1.0", "status": "operational"}


@app.get("/api/buses/live")
def get_live_buses(db: Session = Depends(get_db)):
    """Return all bus GPS positions, moving slightly each call."""
    _init_bus_state(db)
    buses = db.query(BusGPS).all()
    result = []
    for bus in buses:
        new_lat, new_lng, speed = _move_bus(
            bus.bus_id, bus.route_id, bus.lat, bus.lng, bus.status, bus.delay_min
        )
        # Update DB position
        bus.lat = new_lat
        bus.lng = new_lng
        bus.speed_kmph = speed

        # Slightly vary occupancy
        occ_delta = random.uniform(-2, 2)
        bus.occupancy_pct = max(0, min(150, bus.occupancy_pct + occ_delta))

        result.append({
            "bus_id": bus.bus_id,
            "route_id": bus.route_id,
            "lat": round(new_lat, 6),
            "lng": round(new_lng, 6),
            "speed_kmph": speed,
            "occupancy_pct": round(bus.occupancy_pct, 1),
            "delay_min": bus.delay_min,
            "status": bus.status,
            "heading": bus.heading,
            "next_stop_id": bus.next_stop_id,
            "next_stop_eta_min": bus.next_stop_eta_min,
        })

    db.commit()
    return result


@app.get("/api/routes")
def get_routes(db: Session = Depends(get_db)):
    return [
        {
            "route_id": r.route_id, "route_no": r.route_no, "route_name": r.route_name,
            "origin": r.origin, "destination": r.destination, "depot_id": r.depot_id,
            "distance_km": r.distance_km, "total_stops": r.total_stops,
            "peak_headway_min": r.peak_headway_min, "offpeak_headway_min": r.offpeak_headway_min,
            "trip_time_min": r.trip_time_min, "service_type": r.service_type,
            "daily_trips": r.daily_trips, "daily_passengers_avg": r.daily_passengers_avg,
        }
        for r in db.query(Route).all()
    ]


@app.get("/api/stops")
def get_stops(db: Session = Depends(get_db)):
    return [
        {
            "stop_id": s.stop_id, "stop_name": s.stop_name, "stop_name_tamil": s.stop_name_tamil,
            "lat": s.lat, "lng": s.lng, "area": s.area, "zone": s.zone,
            "interchange_type": s.interchange_type, "landmark": s.landmark,
            "routes_serving": s.routes_serving,
        }
        for s in db.query(Stop).all()
    ]


@app.get("/api/depots")
def get_depots(db: Session = Depends(get_db)):
    return [
        {
            "depot_id": d.depot_id, "depot_code": d.depot_code, "depot_name": d.depot_name,
            "depot_name_tamil": d.depot_name_tamil, "lat": d.lat, "lng": d.lng,
            "address": d.address, "fleet_size": d.fleet_size, "spare_buses": d.spare_buses,
            "routes_managed": d.routes_managed, "zone_coverage": d.zone_coverage,
            "contact_code": d.contact_code,
        }
        for d in db.query(Depot).all()
    ]


@app.get("/api/incidents")
def get_incidents(db: Session = Depends(get_db)):
    return [
        {
            "incident_id": i.incident_id, "type": i.type, "location_name": i.location_name,
            "lat": i.lat, "lng": i.lng, "severity": i.severity,
            "affected_routes": i.affected_routes, "diversion_suggestion": i.diversion_suggestion,
            "start_time": i.start_time, "estimated_duration_min": i.estimated_duration_min,
            "status": i.status, "reporter": i.reporter,
        }
        for i in db.query(Incident).all()
    ]


@app.get("/api/events")
def get_events():
    return [
        {
            "event_id": "EV001",
            "event_name": "CSK vs MI — IPL 2025",
            "venue": "MA Chidambaram Stadium, Chepauk",
            "venue_lat": 13.0622,
            "venue_lng": 80.2793,
            "event_type": "IPL Cricket Match",
            "expected_attendance": 37505,
            "start_datetime": "2025-04-25 19:30",
            "end_datetime": "2025-04-25 23:00",
            "impact_radius_km": 3.0,
            "affected_routes": "23C;21G;9;29C",
            "surge_factor": 3.4,
            "notes": "Free MTC travel for ticket holders. Heavy rain expected."
        }
    ]


@app.get("/api/kpis")
def get_kpis(db: Session = Depends(get_db)):
    buses = db.query(BusGPS).all()
    overloaded = sum(1 for b in buses if b.occupancy_pct > 85 or b.status == "overloaded")
    delayed = sum(1 for b in buses if b.delay_min > 5 or b.status == "delayed")
    incidents = db.query(Incident).filter(Incident.status == "active").count()
    alerts = db.query(PassengerAlert).count()

    base_wait = _kpi_override.get("avg_wait_time", 22)
    base_bunching = _kpi_override.get("bunching_incidents", 3)
    base_alerts = _kpi_override.get("alerts_sent", alerts)

    return {
        "avg_wait_time_min": base_wait,
        "bunching_incidents": base_bunching,
        "overloaded_buses": overloaded,
        "delayed_buses": delayed,
        "alerts_sent_today": base_alerts,
        "active_incidents": incidents,
        "total_buses_tracked": len(buses),
        "fleet_utilization_pct": round(len(buses) / 3376 * 100, 2),
        "timestamp": datetime.now().isoformat(),
    }


@app.get("/api/alerts")
def get_alerts(db: Session = Depends(get_db)):
    return [
        {
            "alert_id": a.alert_id, "route_id": a.route_id, "stop_id": a.stop_id,
            "alert_type": a.alert_type, "message_english": a.message_english,
            "message_tamil": a.message_tamil, "severity": a.severity,
            "issued_time": a.issued_time, "valid_until": a.valid_until, "channel": a.channel,
        }
        for a in db.query(PassengerAlert).all()
    ]


@app.get("/api/dispatch")
def get_dispatch(db: Session = Depends(get_db)):
    return [
        {
            "action_id": d.action_id, "timestamp": d.timestamp, "trigger_type": d.trigger_type,
            "trigger_description": d.trigger_description, "route_id": d.route_id,
            "recommendation": d.recommendation, "officer_id": d.officer_id,
            "officer_name": d.officer_name, "status": d.status,
            "depot_assigned": d.depot_assigned, "buses_requested": d.buses_requested,
            "buses_dispatched": d.buses_dispatched, "estimated_impact_min": d.estimated_impact_min,
            "actual_impact_min": d.actual_impact_min,
        }
        for d in db.query(DispatchAction).all()
    ]


class ApproveRequest(BaseModel):
    action_id: str
    officer_id: str = "OFF001"
    officer_name: str = "Karthik Kumar"


@app.post("/api/dispatch/approve")
def approve_dispatch(req: ApproveRequest, db: Session = Depends(get_db)):
    action = db.query(DispatchAction).filter(DispatchAction.action_id == req.action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
    action.status = "approved"
    action.officer_id = req.officer_id
    action.officer_name = req.officer_name
    action.buses_dispatched = action.buses_requested
    db.commit()
    return {
        "message": f"✓ Action {req.action_id} approved by {req.officer_name}",
        "depot": action.depot_assigned,
        "buses_dispatched": action.buses_dispatched,
        "driver_alert": f"Route change: Deploy on {action.route_id}. Acknowledge.",
        "timestamp": datetime.now().isoformat(),
    }


@app.post("/api/dispatch/reject")
def reject_dispatch(req: ApproveRequest, db: Session = Depends(get_db)):
    action = db.query(DispatchAction).filter(DispatchAction.action_id == req.action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
    action.status = "rejected"
    db.commit()
    return {"message": f"Action {req.action_id} rejected by {req.officer_name}"}


class OptimizeRequest(BaseModel):
    route_id: str
    current_headway: int
    demand_score: float
    condition: str
    time_of_day: str


@app.post("/api/ai/optimize")
async def ai_optimize(req: OptimizeRequest, db: Session = Depends(get_db)):
    route = db.query(Route).filter(Route.route_id == req.route_id).first()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")

    depot = db.query(Depot).filter(Depot.depot_id == route.depot_id).first()
    spare_buses = depot.spare_buses if depot else 10

    # Get overloaded buses on route
    buses_on_route = db.query(BusGPS).filter(BusGPS.route_id == req.route_id).all()
    max_occ = max((b.occupancy_pct for b in buses_on_route), default=75)

    result = await gemini_engine.optimize_frequency(
        route_no=route.route_no,
        origin=route.origin,
        destination=route.destination,
        current_headway=req.current_headway,
        max_occupancy=max_occ,
        demand_score=req.demand_score,
        condition=req.condition,
        time_of_day=req.time_of_day,
        depot=route.depot_id,
        spare_buses=spare_buses,
        congestion="High" if req.demand_score > 7 else "Medium"
    )

    # Create a dispatch action
    action_id = f"DA{random.randint(1000, 9999)}"
    extra = result.get("extra_buses_needed", 0)
    action = DispatchAction(
        action_id=action_id,
        timestamp=datetime.now().strftime("%Y-%m-%d %H:%M"),
        trigger_type="AI_Prediction",
        trigger_description=f"AI optimization for Route {route.route_no} — {req.condition}",
        route_id=req.route_id,
        recommendation=result.get("depot_instruction", ""),
        officer_id="OFF001",
        officer_name="Karthik Kumar",
        status="pending",
        depot_assigned=route.depot_id,
        buses_requested=extra,
        buses_dispatched=0,
        estimated_impact_min=result.get("recommended_headway_min", req.current_headway),
        actual_impact_min=0,
    )
    db.add(action)
    db.commit()

    return {**result, "action_id": action_id, "route": {
        "route_no": route.route_no, "origin": route.origin,
        "destination": route.destination, "depot_id": route.depot_id,
    }}


class RerouteRequest(BaseModel):
    incident_id: str


@app.post("/api/ai/reroute")
async def ai_reroute(req: RerouteRequest, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.incident_id == req.incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    result = await gemini_engine.generate_reroute(
        incident_type=incident.type,
        location=incident.location_name,
        severity=incident.severity,
        routes=incident.affected_routes,
        normal_path=f"Normal route via {incident.location_name}",
        alternate=incident.diversion_suggestion,
        alt_traffic="Moderate"
    )

    # Add passenger alert to DB
    alert = PassengerAlert(
        alert_id=f"PA{random.randint(100, 999)}",
        route_id=incident.affected_routes.split(";")[0],
        stop_id="S001",
        alert_type="Diversion",
        message_english=result.get("alert_english", "Route diverted. Check updates."),
        message_tamil=result.get("alert_tamil", "பேருந்து திருப்பப்பட்டுள்ளது."),
        severity=incident.severity,
        issued_time=datetime.now().strftime("%Y-%m-%d %H:%M"),
        valid_until=datetime.now().strftime("%Y-%m-%d 23:59"),
        channel="display_app_sms"
    )
    db.add(alert)
    db.commit()

    return result


@app.post("/api/scenario/ipl_rain")
async def trigger_ipl_rain(db: Session = Depends(get_db)):
    """Trigger the Chepauk IPL + Rain demo scenario."""
    result = await gemini_engine.generate_ipl_rain_plan()

    # Add extra dispatch actions
    new_actions = [
        DispatchAction(
            action_id=f"IPL-DA-{uuid.uuid4().hex[:6].upper()}",
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M"),
            trigger_type="Scenario_IPL_Rain",
            trigger_description="IPL CSK vs MI + Heavy Rain in T Nagar/Chepauk",
            route_id="R002",
            recommendation="Deploy 4 extra buses on 21G from Adyar Depot",
            officer_id="OFF001",
            officer_name="Karthik Kumar",
            status="pending",
            depot_assigned="ADR",
            buses_requested=4,
            buses_dispatched=0,
            estimated_impact_min=8,
            actual_impact_min=0,
        ),
        DispatchAction(
            action_id=f"IPL-DA-{uuid.uuid4().hex[:6].upper()}",
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M"),
            trigger_type="Scenario_IPL_Rain",
            trigger_description="Waterlogging at Velachery Bypass — divert 29C",
            route_id="R006",
            recommendation="Divert 29C via Pallikaranai Road",
            officer_id="OFF002",
            officer_name="Priya Nair",
            status="pending",
            depot_assigned="SPD",
            buses_requested=0,
            buses_dispatched=0,
            estimated_impact_min=12,
            actual_impact_min=0,
        )
    ]
    for a in new_actions:
        db.add(a)

    # Add passenger alerts
    for alert_data in result.get("event_passenger_alerts", []):
        pa = PassengerAlert(
            alert_id=f"PA-IPL-{uuid.uuid4().hex[:6].upper()}",
            route_id="R001",
            stop_id="S012",
            alert_type="Crowd Alert",
            message_english=alert_data.get("english", ""),
            message_tamil=alert_data.get("tamil", ""),
            severity="High",
            issued_time=datetime.now().strftime("%Y-%m-%d %H:%M"),
            valid_until=datetime.now().strftime("%Y-%m-%d 23:59"),
            channel="display_app_sms"
        )
        db.add(pa)

    # Update MTC-2902 to overloaded
    bus = db.query(BusGPS).filter(BusGPS.bus_id == "MTC-2902").first()
    if bus:
        bus.status = "overloaded"
        bus.occupancy_pct = 130

    db.commit()

    # Update KPIs
    _kpi_override["avg_wait_time"] = 22  # Will be updated in steps on frontend
    _kpi_override["bunching_incidents"] = 3

    return {
        "scenario": "IPL + Rain — Chepauk",
        "steps_count": 10,
        "ai_recommendation": result.get("optimize", {}),
        "reroute_29c": result.get("reroute_29c", {}),
        "passenger_alerts": result.get("event_passenger_alerts", []),
        "affected_buses": ["MTC-2102", "MTC-2303", "MTC-2902", "MTC-2901"],
        "new_dispatch_ids": [a.action_id for a in new_actions],
        "timestamp": datetime.now().isoformat(),
    }


@app.post("/api/scenario/update_kpis")
def update_kpis_for_scenario(wait_time: int = 16, bunching: int = 1, alerts: int = 7):
    """Update KPIs to reflect post-scenario improvement."""
    _kpi_override["avg_wait_time"] = wait_time
    _kpi_override["bunching_incidents"] = bunching
    _kpi_override["alerts_sent"] = alerts
    return {"updated": True, "kpis": _kpi_override}


@app.get("/api/road_segments")
def get_road_segments():
    return [
        {"segment_id": "SEG001", "segment_name": "Anna Salai Central", "from_lat": 13.0641, "from_lng": 80.2501,
         "to_lat": 13.0452, "to_lng": 80.2483, "congestion_level": "High", "current_speed_kmph": 12,
         "normal_speed_kmph": 35, "incident_flag": True, "affected_routes": "23C;29C"},
        {"segment_id": "SEG002", "segment_name": "GST Road Guindy", "from_lat": 13.0068, "from_lng": 80.2206,
         "to_lat": 12.9673, "to_lng": 80.1574, "congestion_level": "High", "current_speed_kmph": 22,
         "normal_speed_kmph": 50, "incident_flag": False, "affected_routes": "23C;70"},
        {"segment_id": "SEG003", "segment_name": "Kamarajar Salai", "from_lat": 13.0523, "from_lng": 80.2818,
         "to_lat": 13.0622, "to_lng": 80.2793, "congestion_level": "Very High", "current_speed_kmph": 8,
         "normal_speed_kmph": 40, "incident_flag": True, "affected_routes": "23C;21G;9"},
        {"segment_id": "SEG004", "segment_name": "Wallajah Road", "from_lat": 13.0622, "from_lng": 80.2793,
         "to_lat": 13.0827, "to_lng": 80.2757, "congestion_level": "Very High", "current_speed_kmph": 6,
         "normal_speed_kmph": 30, "incident_flag": True, "affected_routes": "9;23C"},
        {"segment_id": "SEG005", "segment_name": "OMR Phase 1", "from_lat": 12.9587, "from_lng": 80.2415,
         "to_lat": 12.9007, "to_lng": 80.2267, "congestion_level": "Low", "current_speed_kmph": 45,
         "normal_speed_kmph": 60, "incident_flag": False, "affected_routes": "19B"},
        {"segment_id": "SEG006", "segment_name": "Velachery Main Road", "from_lat": 12.9745, "from_lng": 80.2150,
         "to_lat": 12.9815, "to_lng": 80.2209, "congestion_level": "Very High", "current_speed_kmph": 5,
         "normal_speed_kmph": 30, "incident_flag": True, "affected_routes": "29C;M15"},
    ]


# ═══════════════════════════════════════════════════════════════════════════
# GPS TRACKING ENDPOINTS — powered by enrich_data.py generated JSON files
# These serve the real MTC data for the Leaflet live-map view
# ═══════════════════════════════════════════════════════════════════════════

_BACKEND_DIR = pathlib.Path(__file__).parent
_DATA_DIR    = _BACKEND_DIR.parent / "data"

_gps_road_paths: dict  = {}
_gps_routes: dict      = {}
_gps_bus_state: dict   = {}  # bus_id → mutable bus dict


def _load_gps_data():
    """Load enriched JSON data lazily (only if files exist)."""
    global _gps_road_paths, _gps_routes, _gps_bus_state
    if _gps_road_paths:
        return  # already loaded

    road_path_file   = _DATA_DIR / "road_paths.json"
    routes_file      = _DATA_DIR / "routes_gps_enriched.json"
    bus_pos_file     = _DATA_DIR / "bus_positions.json"

    if not road_path_file.exists():
        return  # data pipeline hasn't been run yet

    with open(road_path_file) as f:
        _gps_road_paths = json.load(f)
    with open(routes_file) as f:
        _gps_routes = json.load(f)
    with open(bus_pos_file) as f:
        buses = json.load(f)
    _gps_bus_state = {b["bus_id"]: dict(b) for b in buses}


def _advance_gps_bus(bus: dict) -> dict:
    """Move a GPS-tracked bus forward along its OSRM road path."""
    route_id = str(bus["route_id"])
    path = _gps_road_paths.get(route_id, [])
    if not path:
        return bus

    speed = bus.get("speed_kmph", 15)
    # Probabilistic advancement — faster bus moves more often
    if random.random() < speed / 150:
        direction = 1 if bus["direction"] == "outbound" else -1
        new_idx = bus["path_index"] + direction

        if new_idx >= len(path) - 1:
            bus["direction"] = "inbound"
            new_idx = len(path) - 2
        elif new_idx <= 0:
            bus["direction"] = "outbound"
            new_idx = 1

        bus["path_index"] = new_idx
        bus["lat"] = path[new_idx][0]
        bus["lng"] = path[new_idx][1]

    # Mild speed variation
    bus["speed_kmph"] = round(
        max(3.0, min(35.0, bus["speed_kmph"] + random.uniform(-2, 2))), 1
    )
    bus["last_updated"] = datetime.now().isoformat()
    return bus


def _haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Distance in km between two GPS points."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2))
         * math.sin(dlng / 2) ** 2)
    return R * 2 * math.asin(math.sqrt(a))


@app.get("/api/buses")
def get_gps_buses():
    """
    Real-data bus positions advancing along OSRM road paths.
    Powers the Leaflet live-tracking map view.
    Returns 404 hint if enrich_data.py hasn't been run yet.
    """
    _load_gps_data()
    if not _gps_bus_state:
        return {
            "error": "GPS data not ready. Run: python scripts/enrich_data.py",
            "buses": []
        }
    for bus_id in _gps_bus_state:
        _gps_bus_state[bus_id] = _advance_gps_bus(_gps_bus_state[bus_id])
    return list(_gps_bus_state.values())


@app.get("/api/buses/{bus_id}/path")
def get_gps_bus_path(bus_id: str):
    """Return upcoming road path for a specific GPS-tracked bus."""
    _load_gps_data()
    bus = _gps_bus_state.get(bus_id)
    if not bus:
        raise HTTPException(status_code=404, detail="Bus not found")
    path = _gps_road_paths.get(str(bus["route_id"]), [])
    idx = bus["path_index"]
    upcoming = (
        path[idx: idx + 50]
        if bus["direction"] == "outbound"
        else path[max(0, idx - 50): idx][::-1]
    )
    return {"bus_id": bus_id, "upcoming_path": upcoming, "total_path": path}


@app.get("/api/routes/{route_id}/path")
def get_gps_route_path(route_id: str):
    """Return the full OSRM road geometry for a route."""
    _load_gps_data()
    return {"route_id": route_id, "path": _gps_road_paths.get(route_id, [])}


@app.get("/api/routes/{route_id}/buses")
def get_gps_buses_on_route(route_id: str):
    """Return all GPS-tracked buses currently on a route."""
    _load_gps_data()
    return [b for b in _gps_bus_state.values() if str(b["route_id"]) == route_id]


@app.get("/api/gps/routes")
def get_gps_routes():
    """Return all GPS-enriched routes (for map polyline rendering)."""
    _load_gps_data()
    return [
        {
            "route_id":          k,
            "stops":             v["stops"],
            "stop_count":        v["stop_count"],
            "gps_coverage_pct":  v["gps_coverage_pct"],
        }
        for k, v in _gps_routes.items()
    ]


@app.get("/api/gps/stops")
def get_gps_stops():
    """Return all stops that have GPS coordinates (from enriched route data)."""
    _load_gps_data()
    stops: dict = {}
    for route in _gps_routes.values():
        for stop in route["stops"]:
            if stop["has_gps"] and stop["name"] not in stops:
                stops[stop["name"]] = {
                    "name":   stop["name"],
                    "lat":    stop["lat"],
                    "lng":    stop["lng"],
                    "routes": []
                }
            if stop["has_gps"] and route["route_id"] not in stops.get(stop["name"], {}).get("routes", []):
                if stop["name"] in stops:
                    stops[stop["name"]]["routes"].append(route["route_id"])
    return list(stops.values())


@app.get("/api/gps/stops/{stop_name}/arrivals")
def get_gps_stop_arrivals(stop_name: str):
    """
    Chalo-style ETA board: predict bus arrivals at a stop using
    haversine distance from current bus positions.
    """
    _load_gps_data()
    stop_name_upper = stop_name.upper()
    arrivals = []

    for route in _gps_routes.values():
        for stop in route["stops"]:
            if stop["name"] == stop_name_upper and stop["has_gps"]:
                route_buses = [
                    b for b in _gps_bus_state.values()
                    if str(b["route_id"]) == route["route_id"]
                ]
                for bus in route_buses:
                    if bus.get("lat") and bus.get("lng"):
                        dist_km = _haversine(
                            bus["lat"], bus["lng"], stop["lat"], stop["lng"]
                        )
                        speed = max(5, bus.get("speed_kmph", 15))
                        eta_min = round((dist_km / speed) * 60)
                        if eta_min < 60:
                            arrivals.append({
                                "bus_id":      bus["bus_id"],
                                "route_id":    bus["route_id"],
                                "eta_min":     eta_min,
                                "occupancy":   bus["occupancy"],
                                "status":      bus["status"],
                                "distance_km": round(dist_km, 2),
                            })

    arrivals.sort(key=lambda x: x["eta_min"])
    return arrivals[:5]


@app.get("/api/search")
def gps_search(q: str):
    """Search stops and routes from GPS-enriched data — for the search bar."""
    _load_gps_data()
    q_upper = q.upper()
    results = {"stops": [], "routes": []}

    for route in _gps_routes.values():
        if q_upper in str(route["route_id"]).upper():
            results["routes"].append({
                "route_id":  route["route_id"],
                "stop_count": route["stop_count"]
            })
        for stop in route["stops"]:
            if stop["has_gps"] and q_upper in stop["name"]:
                if not any(r["name"] == stop["name"] for r in results["stops"]):
                    results["stops"].append({
                        "name": stop["name"],
                        "lat":  stop["lat"],
                        "lng":  stop["lng"]
                    })

    results["stops"]  = results["stops"][:8]
    results["routes"] = results["routes"][:5]
    return results


@app.get("/api/gps/status")
def get_gps_data_status():
    """Check whether the GPS data pipeline has been run."""
    road_path_file = _DATA_DIR / "road_paths.json"
    routes_file    = _DATA_DIR / "routes_gps_enriched.json"
    bus_pos_file   = _DATA_DIR / "bus_positions.json"
    return {
        "road_paths_ready":  road_path_file.exists(),
        "routes_ready":      routes_file.exists(),
        "bus_positions_ready": bus_pos_file.exists(),
        "buses_in_memory":   len(_gps_bus_state),
        "routes_in_memory":  len(_gps_routes),
        "data_dir":          str(_DATA_DIR),
    }
