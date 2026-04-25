"use client"
import React, { useState, useEffect, useRef, useCallback } from 'react';
import UBOCCMap from './Map';
import DemoModeOverlay from './DemoModeOverlay';
import IncidentScenario from './IncidentScenario';
import type { DemoLayer, MapHandle } from './Map';

const API = 'http://localhost:8001';

const SCENARIO_STEPS = [
  { id:1, icon:'🏏', title:'EVENT DETECTED', lines:['CSK vs MI IPL match at MA Chidambaram Stadium, Chepauk','Expected attendance: 37,505 | Match starts: 19:30','Est. dispersal: 22:00–22:45 | Free MTC travel for ticket holders'] },
  { id:2, icon:'🌧️', title:'WEATHER ALERT', lines:['IMD Warning: Heavy rain in Chennai Central, T Nagar, Chepauk zones','Rainfall: 35mm expected between 20:00–23:00','Waterlogging risk: Velachery Bypass — HIGH | Saidapet underpass — MEDIUM'] },
  { id:3, icon:'🤖', title:'AI PREDICTION ENGINE', lines:['Route 23C: 340% demand surge predicted at Chepauk stop (22:00–22:45)','Route 21G: 290% surge predicted at Marina Beach approach','Route 29C: Velachery section BLOCKED — waterlogging risk imminent','Route 9: Wallajah Road speed 6 km/h — critical congestion'], isAI:true },
  { id:4, icon:'⚠️', title:'PRIORITY SCORING', lines:['🔴 CRITICAL: Chepauk crowd dispersal — 37,505 passengers','🟠 HIGH: Velachery waterlogging — 3 routes affected','🟡 MEDIUM: Anna Salai congestion — evening peak overlap with 23C'] },
  { id:5, icon:'🤖', title:'GEMINI RECOMMENDATION', lines:['Deploy 4 extra buses on Route 21G (Adyar Depot — ADR)','Hold MTC-2303 at Saidapet for 10 min to clear Guindy congestion','Divert 29C via Pallikaranai Road — bypass flooded Velachery','Confidence: 0.91 | Urgency: CRITICAL | Response time needed: <15 min'], isAI:true },
  { id:6, icon:'👮', title:'OFFICER APPROVAL', lines:['Officer Karthik Kumar, Zone Control — reviewing recommendation...','✓ APPROVED at 19:42:33 | Officer ID: OFF001','All recommendations accepted. Depots notified.'], isApproval:true },
  { id:7, icon:'🏭', title:'DEPOT DISPATCH', lines:['Adyar Depot (ADR): DISPATCH 4 buses on Route 21G immediately','T Nagar Depot (TNG): HOLD 2 spare buses on standby for surge','Saidapet Depot (SPD): Reroute 29C drivers — new path briefed','Buses deploying: MTC-2101, MTC-2103, MTC-2104, MTC-2105'] },
  { id:8, icon:'📱', title:'DRIVER ALERTS SENT', lines:['MTC-2303 → "Hold at Saidapet Bus Stop 10 min. Resume 19:52. Ack?"','MTC-2901 (29C) → "ROUTE CHANGE: Skip Velachery Bypass. Use Pallikaranai Road."','✓ MTC-2303 Acknowledged 19:43 | ✓ MTC-2901 Acknowledged 19:44'], isSMS:true },
  { id:9, icon:'📣', title:'PASSENGER ALERTS FIRED', lines:['[Broadway] 3 extra 21G buses en route — wait max 8 min','[Chepauk] Heavy crowd post-match. 23C delayed. Use 21G. Next bus: 7 min','[Velachery] 29C DIVERTED. Via Pallikaranai Road. Extra time: 12 min'] },
  { id:10, icon:'📊', title:'DASHBOARD UPDATE', lines:['✅ Wait time: 22 min → 16 min (−27%)','✅ Bunching incidents: 3 → 1 (−67%)','✅ Alerts sent: 4 → 7 (+3 new alerts)','🏆 U-BOCC total response time: 11 minutes'], isSuccess:true },
];

export default function Dashboard() {
  const [routes, setRoutes] = useState<any[]>([]);
  const [buses, setBuses] = useState<any[]>([]);
  const [stops, setStops] = useState<any[]>([]);
  const [depots, setDepots] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [approvals, setApprovals] = useState([{ id:'A1', route:'21G', reason:'Chepauk IPL match ended. Traffic delay >15m.', eta_before:'45 mins', eta_after:'30 mins', buses_requested:5, depot:'D1', status:'pending' }]);
  const [demoMode, setDemoMode] = useState(false);
  const [demoLayers, setDemoLayers] = useState<DemoLayer[]>([]);
  const [mapView, setMapView] = useState<'command'|'tracking'>('command');
  const [activeTab, setActiveTab] = useState<'alerts'|'scenario'>('alerts');
  const [scenarioStep, setScenarioStep] = useState(0);
  const [scenarioRunning, setScenarioRunning] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [scenarioDone, setScenarioDone] = useState(false);
  const [kpis, setKpis] = useState({ avgWait:22, bunching:3, alerts:4, buses:15 });
  const mapRef = useRef<MapHandle>(null);
  const stepTimer = useRef<ReturnType<typeof setTimeout>|null>(null);

  useEffect(() => {
    fetch(`${API}/api/initial-state`).then(r=>r.json()).then(d=>{
      setRoutes(d.routes||[]); setStops(d.stops||[]); setDepots(d.depots||[]); setEvents(d.events||[]);
    }).catch(()=>{});
    const ws = new WebSocket(`ws://localhost:8001/ws`);
    ws.onmessage = (e) => {
      try {
        const p = JSON.parse(e.data);
        if (p.type==='BUS_UPDATE') setBuses(p.data);
        if (p.type==='NOTIFICATION') setNotifications(prev=>[p.message,...prev].slice(0,5));
      } catch {}
    };
    return () => ws.close();
  }, []);

  const runScenario = () => {
    setScenarioRunning(true); setScenarioStep(1); setCompletedSteps([]); setScenarioDone(false);
    let step = 1;
    const advance = () => {
      if (step >= SCENARIO_STEPS.length) { setScenarioDone(true); setScenarioRunning(false); setKpis({avgWait:16,bunching:1,alerts:7,buses:19}); return; }
      setCompletedSteps(prev=>[...prev,step]); step++; setScenarioStep(step);
      stepTimer.current = setTimeout(advance, 2500);
    };
    stepTimer.current = setTimeout(advance, 2500);
  };

  const resetScenario = () => {
    if (stepTimer.current) clearTimeout(stepTimer.current);
    setScenarioRunning(false); setScenarioStep(0); setCompletedSteps([]); setScenarioDone(false);
  };

  const handleApprove = async (a: any) => {
    try {
      await fetch(`${API}/api/approve-dispatch`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({depot_id:a.depot,route_id:a.route,buses_requested:a.buses_requested})});
      setApprovals(prev=>prev.filter(x=>x.id!==a.id));
      setNotifications(prev=>[`✅ ${a.buses_requested} extra buses deployed on Route ${a.route}`,...prev].slice(0,5));
    } catch {}
  };

  const activeBuses = buses.length || kpis.buses;
  const delayedBuses = buses.filter(b=>b.status==='delayed').length;
  const overloadedBuses = buses.filter(b=>b.status==='overloaded').length;

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',background:'#020817',color:'#e2e8f0',overflow:'hidden',fontFamily:'var(--font-geist-sans),Inter,system-ui,sans-serif'}}>

      {/* ── HEADER ── */}
      <header style={{height:56,background:'rgba(15,23,42,0.95)',borderBottom:'1px solid #1e3a5f',display:'flex',alignItems:'center',padding:'0 16px',gap:12,flexShrink:0,backdropFilter:'blur(10px)'}}>
        <div style={{width:32,height:32,borderRadius:8,background:'linear-gradient(135deg,#3b82f6,#1d4ed8)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,color:'white',fontSize:15,boxShadow:'0 0 15px rgba(59,130,246,0.5)'}}>U</div>
        <div>
          <div style={{fontSize:14,fontWeight:700,letterSpacing:0.5}}>Chennai U-BOCC</div>
          <div style={{fontSize:9,color:'#64748b',letterSpacing:1,textTransform:'uppercase'}}>Urban Bus Operations Command Center</div>
        </div>

        {/* IPL Banner */}
        {events[0] && (
          <div style={{marginLeft:12,background:'rgba(245,158,11,0.1)',border:'1px solid rgba(245,158,11,0.3)',borderRadius:6,padding:'3px 10px',fontSize:11,color:'#fcd34d',display:'flex',gap:8,alignItems:'center'}}>
            <span>🏏</span><span style={{fontWeight:700}}>IPL TONIGHT</span>
            <span style={{color:'#f59e0b'}}>{events[0].type} @ {events[0].location}</span>
            <span style={{background:'rgba(239,68,68,0.2)',color:'#f87171',padding:'1px 6px',borderRadius:3,fontSize:9,animation:'blink 1.5s ease infinite'}}>ALERT</span>
          </div>
        )}

        <div style={{flex:1}}/>

        {/* KPI Strip */}
        {[
          {l:'Avg Wait',v:`${kpis.avgWait} min`,c:'#60a5fa'},
          {l:'Bunching',v:`${kpis.bunching}`,c:'#f97316'},
          {l:'Overloaded',v:`${overloadedBuses||2}`,c:'#ef4444'},
          {l:'Alerts',v:`${kpis.alerts}`,c:'#22c55e'},
          {l:'Buses Live',v:`${activeBuses}`,c:'#a855f7'},
        ].map(k=>(
          <div key={k.l} style={{background:'#1e293b',border:'1px solid #334155',borderRadius:5,padding:'4px 10px',textAlign:'center'}}>
            <div style={{fontSize:9,color:'#64748b',textTransform:'uppercase'}}>{k.l}</div>
            <div style={{fontSize:14,fontWeight:700,color:k.c,fontFamily:'var(--font-geist-mono),monospace'}}>{k.v}</div>
          </div>
        ))}

        {/* Demo Mode Button */}
        <button onClick={()=>setDemoMode(true)} style={{background:'linear-gradient(135deg,#f59e0b,#ef4444)',color:'#000',fontWeight:700,padding:'7px 14px',borderRadius:8,border:'none',fontSize:12,cursor:'pointer',boxShadow:'0 0 20px rgba(245,158,11,0.4)',animation:'blink 2s ease infinite',display:'flex',alignItems:'center',gap:5}}>
          ▶ DEMO MODE
        </button>
      </header>

      {/* ── MAIN ── */}
      <main style={{flex:1,display:'flex',overflow:'hidden'}}>

        {/* LEFT PANEL */}
        <div style={{width:230,minWidth:230,background:'#0a0f1e',borderRight:'1px solid #1e3a5f',display:'flex',flexDirection:'column',overflow:'hidden'}}>
          {/* Tabs */}
          <div style={{display:'flex',borderBottom:'1px solid #1e3a5f',flexShrink:0}}>
            {(['alerts','scenario'] as const).map(tab=>(
              <button key={tab} onClick={()=>setActiveTab(tab)} style={{flex:1,padding:'8px 4px',background:'transparent',border:'none',color:activeTab===tab?'#60a5fa':'#64748b',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:0.5,cursor:'pointer',borderBottom:activeTab===tab?'2px solid #3b82f6':'2px solid transparent'}}>
                {tab==='alerts'?'⚠️ Alerts':'🎬 Scenario'}
              </button>
            ))}
          </div>

          {activeTab==='alerts' && (
            <div style={{flex:1,overflowY:'auto',padding:'8px'}}>
              <div style={{fontSize:9,color:'#475569',textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>Active Incidents</div>
              {[
                {type:'Crowd Surge',loc:'Chepauk — Route 23C',sev:'High'},
                {type:'Waterlogging',loc:'Velachery Bypass',sev:'High'},
                {type:'Heavy Traffic',loc:'Anna Salai',sev:'Medium'},
                {type:'Bus Bunching',loc:'Broadway Terminus',sev:'Medium'},
                {type:'Road Closure',loc:'Saidapet Underpass',sev:'Low'},
                {type:'Metro Work',loc:'Koyambedu',sev:'Low'},
              ].map((inc,i)=>(
                <div key={i} style={{background:'#1e293b',border:'1px solid #334155',borderLeft:`3px solid ${inc.sev==='High'?'#ef4444':inc.sev==='Medium'?'#f97316':'#f59e0b'}`,borderRadius:6,padding:'8px 10px',marginBottom:6}}>
                  <div style={{fontSize:11,fontWeight:600,color:'#e2e8f0'}}>{inc.type}</div>
                  <div style={{fontSize:10,color:'#94a3b8',marginTop:2}}>{inc.loc}</div>
                  <div style={{fontSize:9,color:inc.sev==='High'?'#f87171':inc.sev==='Medium'?'#fb923c':'#fcd34d',marginTop:3}}>{inc.sev.toUpperCase()}</div>
                </div>
              ))}
            </div>
          )}

          {activeTab==='scenario' && (
            <div style={{flex:1,overflowY:'auto',padding:'8px'}}>
              <div style={{fontSize:9,color:'#475569',textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>🏏🌧️ IPL + Rain Simulator</div>
              <div style={{display:'flex',gap:6,marginBottom:8}}>
                {(scenarioDone||scenarioStep>0) && <button onClick={resetScenario} style={{flex:1,padding:'6px',background:'rgba(100,116,139,0.15)',border:'1px solid #334155',borderRadius:5,color:'#94a3b8',fontSize:10,cursor:'pointer'}}>↺ Reset</button>}
                <button onClick={runScenario} disabled={scenarioRunning} style={{flex:2,padding:'6px',background:scenarioRunning?'rgba(100,116,139,0.15)':'linear-gradient(135deg,#f59e0b,#ef4444)',border:'none',borderRadius:5,color:scenarioRunning?'#64748b':'#000',fontSize:10,fontWeight:700,cursor:scenarioRunning?'not-allowed':'pointer'}}>
                  {scenarioRunning?`⏳ Step ${scenarioStep}/10`:'▶ SIMULATE'}
                </button>
              </div>
              {(scenarioRunning||scenarioDone) && (
                <div style={{height:3,background:'#1e293b',borderRadius:2,marginBottom:8}}>
                  <div style={{height:'100%',width:`${(completedSteps.length/SCENARIO_STEPS.length)*100}%`,background:scenarioDone?'#22c55e':'linear-gradient(90deg,#f59e0b,#ef4444)',borderRadius:2,transition:'width 0.5s'}}/>
                </div>
              )}
              {SCENARIO_STEPS.map(s=>{
                const isActive=scenarioStep===s.id, isDone=completedSteps.includes(s.id);
                if(!isActive&&!isDone) return null;
                return(
                  <div key={s.id} style={{background:s.isSuccess?'rgba(34,197,94,0.08)':s.isAI?'rgba(59,130,246,0.08)':'#1e293b',border:`1px solid ${s.isSuccess?'rgba(34,197,94,0.3)':s.isAI?'rgba(59,130,246,0.3)':'#334155'}`,borderRadius:6,padding:'8px',marginBottom:6,opacity:isDone?0.7:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
                      <span style={{fontSize:14}}>{s.icon}</span>
                      <div style={{fontSize:10,fontWeight:700,color:'#e2e8f0'}}>{s.title}</div>
                      {isDone&&<span style={{marginLeft:'auto',color:'#22c55e',fontSize:12}}>✓</span>}
                    </div>
                    {s.lines.slice(0,2).map((l,i)=><div key={i} style={{fontSize:10,color:'#64748b',paddingLeft:6,borderLeft:'2px solid #334155',marginBottom:2}}>{l}</div>)}
                  </div>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div style={{padding:'8px 10px',borderTop:'1px solid #1e3a5f',flexShrink:0}}>
            <div style={{fontSize:9,color:'#475569',textTransform:'uppercase',marginBottom:5}}>Bus Status</div>
            {[['#22c55e','Normal'],['#f59e0b','Crowded'],['#ef4444','Delayed'],['#dc2626','Overloaded']].map(([c,l])=>(
              <div key={l} style={{display:'flex',alignItems:'center',gap:5,marginBottom:3}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:c,flexShrink:0}}/>
                <span style={{fontSize:9,color:'#94a3b8'}}>{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* MAP */}
        <div style={{flex:1,position:'relative',overflow:'hidden'}}>
          {/* Map view toggle */}
          <div style={{position:'absolute',top:10,right:10,zIndex:500,display:'flex',gap:2,background:'rgba(10,15,30,0.85)',borderRadius:8,padding:3,backdropFilter:'blur(8px)',border:'1px solid #1e3a5f'}}>
            {(['command','tracking'] as const).map(v=>(
              <button key={v} onClick={()=>setMapView(v)} style={{padding:'4px 12px',borderRadius:5,border:'none',fontSize:10,fontWeight:600,cursor:'pointer',transition:'all 0.2s',background:mapView===v?(v==='command'?'#f59e0b':'#3b82f6'):'transparent',color:mapView===v?(v==='command'?'#000':'white'):'#94a3b8'}}>
                {v==='command'?'⚡ Command':'🗺️ Tracking'}
              </button>
            ))}
          </div>

          <UBOCCMap ref={mapRef} routes={routes} buses={buses} stops={stops} depots={depots} mapView={mapView} demoLayers={demoLayers} />

          {/* Notifications */}
          <div style={{position:'absolute',bottom:16,left:16,width:300,display:'flex',flexDirection:'column',gap:6,zIndex:10}}>
            {notifications.map((msg,i)=>(
              <div key={i} className="animate-slide-up" style={{background:'rgba(15,23,42,0.92)',border:'1px solid rgba(59,130,246,0.3)',borderRadius:8,padding:'8px 12px',fontSize:11,color:'#cbd5e1',display:'flex',gap:8,alignItems:'flex-start',backdropFilter:'blur(8px)'}}>
                <div style={{width:6,height:6,borderRadius:'50%',background:'#3b82f6',marginTop:2,flexShrink:0,boxShadow:'0 0 6px #3b82f6'}}/>
                {msg}
              </div>
            ))}
          </div>

          {/* Demo Mode Overlay */}
          {demoMode && (
            <DemoModeOverlay
              isActive={demoMode}
              onClose={()=>{setDemoMode(false);setDemoLayers([]);}}
              mapRef={mapRef}
              onLayersChange={setDemoLayers}
              onKpiChange={(k)=>setKpis({avgWait:k.avgWait,bunching:k.bunching,alerts:k.alerts,buses:activeBuses})}
            />
          )}
        </div>

        {/* RIGHT PANEL */}
        <div style={{width:260,minWidth:260,background:'#0a0f1e',borderLeft:'1px solid #1e3a5f',display:'flex',flexDirection:'column',overflow:'hidden'}}>
          <div style={{padding:'8px 10px',borderBottom:'1px solid #1e3a5f',flexShrink:0}}>
            <div style={{fontSize:10,fontWeight:700,color:'#60a5fa',textTransform:'uppercase',letterSpacing:1}}>🤖 AI Recommendations</div>
          </div>

          <div style={{flex:1,overflowY:'auto',padding:'8px'}}>
            {approvals.map(a=>(
              <div key={a.id} style={{background:'#1e293b',border:'1px solid #f59e0b',borderRadius:6,padding:'10px',marginBottom:8,boxShadow:'0 0 12px rgba(245,158,11,0.15)'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                  <span style={{fontSize:10,fontWeight:700,color:'#fcd34d'}}>🤖 AI RECOMMENDATION</span>
                  <span style={{fontSize:9,padding:'1px 5px',background:'rgba(245,158,11,0.15)',color:'#f59e0b',borderRadius:3}}>PENDING</span>
                </div>
                <div style={{fontSize:11,color:'#e2e8f0',marginBottom:8,lineHeight:1.5}}>{a.reason}</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4,fontSize:10,marginBottom:8}}>
                  <div style={{color:'#64748b'}}>Current ETA:</div><div style={{color:'#f87171',fontWeight:600}}>{a.eta_before}</div>
                  <div style={{color:'#64748b'}}>Proj. ETA:</div><div style={{color:'#4ade80',fontWeight:600}}>{a.eta_after}</div>
                  <div style={{color:'#64748b'}}>Buses req:</div><div style={{color:'#e2e8f0'}}>+{a.buses_requested}</div>
                </div>
                <div style={{marginBottom:8}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:9,color:'#64748b',marginBottom:3}}><span>Confidence</span><span>87%</span></div>
                  <div style={{height:4,background:'#1e3a5f',borderRadius:2}}><div style={{height:'100%',width:'87%',background:'#22c55e',borderRadius:2}}/></div>
                </div>
                <div style={{display:'flex',gap:6}}>
                  <button onClick={()=>handleApprove(a)} style={{flex:1,padding:'6px',background:'rgba(34,197,94,0.15)',border:'1px solid rgba(34,197,94,0.4)',borderRadius:5,color:'#4ade80',fontSize:10,fontWeight:700,cursor:'pointer'}}>✓ APPROVE</button>
                  <button onClick={()=>setApprovals(prev=>prev.filter(x=>x.id!==a.id))} style={{flex:1,padding:'6px',background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:5,color:'#f87171',fontSize:10,fontWeight:700,cursor:'pointer'}}>✗ REJECT</button>
                </div>
              </div>
            ))}

            {/* Fleet Status */}
            <div style={{background:'#1e293b',border:'1px solid #334155',borderRadius:6,padding:'10px',marginBottom:8}}>
              <div style={{fontSize:10,fontWeight:700,color:'#94a3b8',marginBottom:8,textTransform:'uppercase'}}>Fleet Status</div>
              {[
                {l:'Normal',c:'#22c55e',n:buses.filter(b=>b.status==='in_transit').length||8},
                {l:'At Stop',c:'#3b82f6',n:buses.filter(b=>b.status==='at_stop').length||3},
                {l:'Delayed',c:'#f97316',n:delayedBuses||2},
                {l:'Overloaded',c:'#ef4444',n:overloadedBuses||2},
              ].map(s=>(
                <div key={s.l} style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5}}>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <div style={{width:8,height:8,borderRadius:'50%',background:s.c}}/>
                    <span style={{fontSize:11,color:'#94a3b8'}}>{s.l}</span>
                  </div>
                  <span style={{fontSize:13,fontWeight:700,color:s.c,fontFamily:'monospace'}}>{s.n}</span>
                </div>
              ))}
            </div>

            {/* Scenario mini-map section */}
            {(scenarioStep>0||scenarioDone) && (
              <div style={{background:'#0f172a',border:'1px solid #1e3a5f',borderRadius:6,overflow:'hidden'}}>
                <div style={{padding:'6px 8px',fontSize:9,color:'#64748b',borderBottom:'1px solid #1e3a5f'}}>
                  📍 Live scenario map — step {scenarioStep}/10
                </div>
                <div style={{height:200}}>
                  <IncidentScenario currentStep={scenarioStep}/>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
