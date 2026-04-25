from sqlalchemy import Column, Integer, String, Float, ForeignKey, Text
from database import Base

class Depot(Base):
    __tablename__ = "depots"
    depot_id = Column(String, primary_key=True, index=True)
    name = Column(String)
    lat = Column(Float)
    lon = Column(Float)
    total_buses = Column(Integer)
    reserve_buses = Column(Integer)

class Route(Base):
    __tablename__ = "routes"
    route_id = Column(String, primary_key=True, index=True)
    route_no = Column(String)
    service_type = Column(String)
    depot_id = Column(String, ForeignKey("depots.depot_id"))

class Stop(Base):
    __tablename__ = "stops"
    stop_id = Column(String, primary_key=True, index=True)
    name = Column(String)
    lat = Column(Float)
    lon = Column(Float)

class RouteShape(Base):
    __tablename__ = "route_shapes"
    shape_id = Column(String, primary_key=True, index=True)
    route_id = Column(String, ForeignKey("routes.route_id"))
    polyline_points = Column(Text) # JSON string of array of [lat, lon]

class Bus(Base):
    __tablename__ = "buses"
    bus_id = Column(String, primary_key=True, index=True)
    route_id = Column(String, ForeignKey("routes.route_id"))
    current_position_index = Column(Integer)
    path_total = Column(Integer)
    speed = Column(Float)
    occupancy = Column(Integer)
    status = Column(String)
    direction = Column(String)

class Event(Base):
    __tablename__ = "events"
    event_id = Column(String, primary_key=True, index=True)
    type = Column(String)
    location = Column(String)
    demand_increase = Column(Float)
    lat = Column(Float)
    lon = Column(Float)
