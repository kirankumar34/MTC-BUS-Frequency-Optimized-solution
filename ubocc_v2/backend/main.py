import asyncio
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import get_db, engine, Base
from models import Depot, Route, Stop, RouteShape, Bus, Event

Base.metadata.create_all(bind=engine)

app = FastAPI(title="U-BOCC v2 Real-Time API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                pass

manager = ConnectionManager()

# Background task to simulate bus movement
async def simulate_bus_movement():
    while True:
        db = next(get_db())
        try:
            buses = db.query(Bus).all()
            updated_buses = []
            for b in buses:
                # Advance bus by a step based on speed. Simplification: 1 index = 1 step
                step_size = max(1, int(b.speed / 10))
                
                if b.direction == "outbound":
                    b.current_position_index += step_size
                    if b.current_position_index >= b.path_total - 1:
                        b.current_position_index = b.path_total - 1
                        b.direction = "inbound"
                else:
                    b.current_position_index -= step_size
                    if b.current_position_index <= 0:
                        b.current_position_index = 0
                        b.direction = "outbound"
                
                # simulate slight speed variance
                
                updated_buses.append({
                    "bus_id": b.bus_id,
                    "route_id": b.route_id,
                    "current_position_index": b.current_position_index,
                    "status": b.status,
                    "occupancy": b.occupancy,
                    "speed": b.speed,
                    "direction": b.direction
                })
            
            db.commit()
            
            # Broadcast the new state
            msg = json.dumps({"type": "BUS_UPDATE", "data": updated_buses})
            await manager.broadcast(msg)
            
        except Exception as e:
            print(f"Simulation error: {e}")
        finally:
            db.close()
            
        await asyncio.sleep(2.0)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(simulate_bus_movement())

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle incoming WS messages if necessary
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.get("/api/initial-state")
def get_initial_state(db: Session = Depends(get_db)):
    depots = db.query(Depot).all()
    events = db.query(Event).all()
    
    # Load routes and their shapes
    routes = db.query(Route).all()
    route_shapes = db.query(RouteShape).all()
    
    shapes_map = {}
    for rs in route_shapes:
        shapes_map[rs.route_id] = json.loads(rs.polyline_points)
        
    routes_data = []
    for r in routes:
        routes_data.append({
            "route_id": r.route_id,
            "route_no": r.route_no,
            "service_type": r.service_type,
            "depot_id": r.depot_id,
            "path": shapes_map.get(r.route_id, [])
        })

    # Stops
    stops = db.query(Stop).all()
    
    return {
        "depots": depots,
        "events": events,
        "routes": routes_data,
        "stops": stops
    }

@app.post("/api/approve-dispatch")
async def approve_dispatch(payload: dict, db: Session = Depends(get_db)):
    # payload: {"depot_id": "D1", "route_id": "21G", "buses_requested": 5}
    depot = db.query(Depot).filter(Depot.depot_id == payload.get("depot_id")).first()
    if depot and depot.reserve_buses >= payload.get("buses_requested", 0):
        depot.reserve_buses -= payload.get("buses_requested", 0)
        depot.total_buses += payload.get("buses_requested", 0)
        db.commit()
        
        # Broadcast notification
        await manager.broadcast(json.dumps({
            "type": "NOTIFICATION",
            "message": f"{payload.get('buses_requested')} extra buses deployed from {depot.name} depot for route {payload.get('route_id')}."
        }))
        return {"status": "success"}
    return {"status": "error", "message": "Insufficient reserve buses"}
