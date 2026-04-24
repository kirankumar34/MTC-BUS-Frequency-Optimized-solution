from sqlalchemy import Column, String, Float, Integer, Boolean, Text, DateTime
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()


class Route(Base):
    __tablename__ = "routes"
    route_id = Column(String, primary_key=True)
    route_no = Column(String)
    route_name = Column(String)
    origin = Column(String)
    destination = Column(String)
    depot_id = Column(String)
    distance_km = Column(Float)
    total_stops = Column(Integer)
    peak_headway_min = Column(Integer)
    offpeak_headway_min = Column(Integer)
    trip_time_min = Column(Integer)
    service_type = Column(String)
    daily_trips = Column(Integer)
    daily_passengers_avg = Column(Integer)


class Stop(Base):
    __tablename__ = "stops"
    stop_id = Column(String, primary_key=True)
    stop_name = Column(String)
    stop_name_tamil = Column(String)
    lat = Column(Float)
    lng = Column(Float)
    area = Column(String)
    zone = Column(String)
    interchange_type = Column(String)
    landmark = Column(String)
    routes_serving = Column(String)


class Depot(Base):
    __tablename__ = "depots"
    depot_id = Column(String, primary_key=True)
    depot_code = Column(String)
    depot_name = Column(String)
    depot_name_tamil = Column(String)
    lat = Column(Float)
    lng = Column(Float)
    address = Column(String)
    fleet_size = Column(Integer)
    spare_buses = Column(Integer)
    routes_managed = Column(String)
    zone_coverage = Column(String)
    contact_code = Column(String)


class BusGPS(Base):
    __tablename__ = "bus_gps"
    bus_id = Column(String, primary_key=True)
    route_id = Column(String)
    trip_id = Column(String)
    lat = Column(Float)
    lng = Column(Float)
    speed_kmph = Column(Float)
    occupancy_pct = Column(Float)
    delay_min = Column(Float)
    status = Column(String)
    heading = Column(String)
    timestamp = Column(String)
    next_stop_id = Column(String)
    next_stop_eta_min = Column(Float)


class Incident(Base):
    __tablename__ = "incidents"
    incident_id = Column(String, primary_key=True)
    type = Column(String)
    location_name = Column(String)
    lat = Column(Float)
    lng = Column(Float)
    severity = Column(String)
    affected_routes = Column(String)
    diversion_suggestion = Column(String)
    start_time = Column(String)
    estimated_duration_min = Column(Integer)
    status = Column(String)
    reporter = Column(String)


class DispatchAction(Base):
    __tablename__ = "dispatch_actions"
    action_id = Column(String, primary_key=True)
    timestamp = Column(String)
    trigger_type = Column(String)
    trigger_description = Column(String)
    route_id = Column(String)
    recommendation = Column(String)
    officer_id = Column(String)
    officer_name = Column(String)
    status = Column(String)
    depot_assigned = Column(String)
    buses_requested = Column(Integer)
    buses_dispatched = Column(Integer)
    estimated_impact_min = Column(Integer)
    actual_impact_min = Column(Integer)


class PassengerAlert(Base):
    __tablename__ = "passenger_alerts"
    alert_id = Column(String, primary_key=True)
    route_id = Column(String)
    stop_id = Column(String)
    alert_type = Column(String)
    message_english = Column(Text)
    message_tamil = Column(Text)
    severity = Column(String)
    issued_time = Column(String)
    valid_until = Column(String)
    channel = Column(String)
