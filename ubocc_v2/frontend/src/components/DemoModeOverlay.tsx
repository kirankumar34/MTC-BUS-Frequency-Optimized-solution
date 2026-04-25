"use client"

import React, { useState, useEffect, useRef } from 'react';
import { CHEPAUK, ADR, DEMO_PATHS } from './Map';
import type { DemoLayer, MapHandle } from './Map';

// ── Demo Steps ──────────────────────────────────────────────────────────────
const STEPS = [
  { id:1, dur:3000, icon:'🏏', title:'EVENT DETECTED', sub:'CSK vs MI at MA Chidambaram Stadium, Chepauk', detail:'37,505 expected • Dispersal: 22:00–22:45 • Surge factor: 3.4×', action:'ZOOM_CHEPAUK' },
  { id:2, dur:2500, icon:'🌧️', title:'WEATHER ALERT', sub:'IMD: Heavy rain — Chennai Central, T Nagar, Chepauk zones', detail:'35mm rainfall 20:00–23:00 • Velachery waterlogging risk: HIGH', action:'RAIN_ZONE' },
  { id:3, dur:3000, icon:'🤖', title:'AI PREDICTION ENGINE', sub:'Gemini 1.5 Flash analyzing 15 data streams…', detail:'Route 23C: 340% surge predicted • Route 29C: BLOCKED • Route 9: 6 km/h', action:'HIGHLIGHT_ROUTES' },
  { id:4, dur:2000, icon:'⚠️', title:'PRIORITY SCORED', sub:'CRITICAL: Chepauk crowd — 37,505 passengers', detail:'HIGH: Velachery flood — 3 routes blocked • MEDIUM: Anna Salai congestion', action:'INCIDENT_ZONES' },
  { id:5, dur:3500, icon:'🤖', title:'GEMINI RECOMMENDATION', sub:'Confidence: 91% • Urgency: CRITICAL', detail:'Deploy 4 buses on 21G (ADR) • Divert 29C via Pallikaranai • Hold MTC-2303 at Saidapet', action:'AI_SUGGESTION' },
  { id:6, dur:2500, icon:'👮', title:'OFFICER APPROVED', sub:'Officer Karthik Kumar, Zone Control — APPROVED at 19:42:33', detail:'Action ID: DA7844 • All recommendations accepted • Depots notified', action:'SPAWN_BUSES' },
  { id:7, dur:3000, icon:'🏭', title:'DEPOT DISPATCH', sub:'ADR: Deploy 4 buses on 21G • SPD: Reroute 29C • TNG: Standby', detail:'Deploying: MTC-2101 MTC-2103 MTC-2104 MTC-2105', action:'DIVERSION' },
  { id:8, dur:2500, icon:'📱', title:'DRIVER ALERTS SENT', sub:'MTC-2303 → "Hold at Saidapet 10 min" ✓ Acknowledged', detail:'MTC-2901 → "ROUTE CHANGE: Skip Velachery Bypass" ✓ Acknowledged', action:'FLASH_BUSES' },
  { id:9, dur:2500, icon:'📣', title:'PASSENGER ALERTS FIRED', sub:'[Broadway] 3 extra 21G buses — wait max 8 min', detail:'[Chepauk] 23C delayed. Use 21G. Next: 7 min • [Velachery] 29C DIVERTED via Pallikaranai', action:'STOP_ALERTS' },
  { id:10, dur:3000, icon:'✅', title:'RESULT — U-BOCC RESPONSE: 11 MIN', sub:'Wait time: 22 min → 16 min (−27%)', detail:'Bunching: 3 → 1 (−67%) • Alerts sent: 4 → 7 • Response: 11 min vs 28 min manual', action:'SHOW_IMPACT' },
];

// ── Spawned bus positions (demo) ─────────────────────────────────────────────
const SPAWNED: Array<{id:string; pos:[number,number]}> = [
  { id:'MTC-2101', pos:[ADR[0]+0.002, ADR[1]+0.003] },
  { id:'MTC-2103', pos:[ADR[0]-0.002, ADR[1]+0.005] },
  { id:'MTC-2104', pos:[ADR[0]+0.004, ADR[1]+0.001] },
  { id:'MTC-2105', pos:[ADR[0]-0.001, ADR[1]+0.007] },
];

// ── Props ────────────────────────────────────────────────────────────────────
interface Props {
  isActive: boolean;
  onClose: () => void;
  mapRef: React.RefObject<MapHandle | null>;
  onLayersChange: (layers: DemoLayer[]) => void;
  onKpiChange?: (kpi: { avgWait: number; bunching: number; alerts: number }) => void;
}

export default function DemoModeOverlay({ isActive, onClose, mapRef, onLayersChange, onKpiChange }: Props) {
  const [step, setStep] = useState(0);      // 0 = not started, 1-10 = active
  const [running, setRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear on close
  useEffect(() => {
    if (!isActive) {
      setStep(0); setRunning(false);
      onLayersChange([]);
      if (timerRef.current) clearTimeout(timerRef.current);
    }
  }, [isActive, onLayersChange]);

  // Execute map action when step changes
  useEffect(() => {
    if (step === 0 || !running) return;
    const s = STEPS[step - 1];
    if (!s) return;

    const map = mapRef.current;
    const layers: DemoLayer[] = [];

    if (s.action === 'ZOOM_CHEPAUK') {
      map?.flyTo(CHEPAUK[0], CHEPAUK[1], 14);
    } else if (s.action === 'RAIN_ZONE') {
      layers.push({ type: 'rain' });
      map?.flyTo(80.2400, 13.0300, 12);
    } else if (s.action === 'HIGHLIGHT_ROUTES' || s.action === 'INCIDENT_ZONES' || s.action === 'AI_SUGGESTION') {
      layers.push({ type: 'rain' });
      layers.push({ type: 'highlight', routeIds: ['23C','21G','29C_n','9'] });
      map?.flyTo(80.2400, 13.0200, 11);
    } else if (s.action === 'SPAWN_BUSES') {
      layers.push({ type: 'highlight', routeIds: ['23C','21G','29C_n'] });
      layers.push({ type: 'spawned', spawnedBuses: SPAWNED });
      map?.flyTo(80.2500, 13.0200, 12);
    } else if (s.action === 'DIVERSION' || s.action === 'FLASH_BUSES' || s.action === 'STOP_ALERTS') {
      layers.push({ type: 'spawned', spawnedBuses: SPAWNED });
      layers.push({ type: 'diversion' });
      map?.flyTo(80.2200, 12.9900, 12);
    } else if (s.action === 'SHOW_IMPACT') {
      layers.push({ type: 'diversion' });
      layers.push({ type: 'spawned', spawnedBuses: SPAWNED });
      map?.flyTo(80.2500, 13.0400, 11);
      onKpiChange?.({ avgWait: 16, bunching: 1, alerts: 7 });
    }

    onLayersChange(layers);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, running, mapRef]);

  // Auto-advance timer
  useEffect(() => {
    if (!running || step === 0 || step > STEPS.length) return;
    const s = STEPS[step - 1];
    timerRef.current = setTimeout(() => {
      if (step >= STEPS.length) { setRunning(false); return; }
      setStep(prev => prev + 1);
    }, s.dur);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [step, running]);

  const start = () => { setStep(1); setRunning(true); };
  const pause = () => { setRunning(false); if (timerRef.current) clearTimeout(timerRef.current); };
  const resume = () => { if (step < STEPS.length) setRunning(true); };
  const reset = () => { setStep(0); setRunning(false); onLayersChange([]); if (timerRef.current) clearTimeout(timerRef.current); };

  if (!isActive) return null;

  const currentStep = step > 0 ? STEPS[step - 1] : null;
  const done = step >= STEPS.length;

  return (
    <div style={{ position:'absolute', inset:0, zIndex:2000, pointerEvents:'none' }}>
      {/* vignette */}
      <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at center,transparent 40%,rgba(0,0,0,0.45) 100%)' }}/>

      {/* TOP STRIP */}
      <div style={{ position:'absolute', top:0, left:0, right:0, pointerEvents:'auto', background:'rgba(15,23,42,0.95)', backdropFilter:'blur(10px)', borderBottom:'1px solid #1e3a5f', padding:'8px 14px', display:'flex', alignItems:'center', gap:6 }}>
        {/* Step dots */}
        {STEPS.map((s, i) => (
          <React.Fragment key={s.id}>
            <div
              onClick={() => { if (i + 1 <= step) { setStep(i + 1); setRunning(false); } }}
              style={{
                width: 26, height: 26, borderRadius: '50%', display:'flex', alignItems:'center', justifyContent:'center',
                fontSize: 10, fontWeight: 700, cursor: i + 1 <= step ? 'pointer' : 'default', transition:'all 0.4s',
                background: i + 1 < step ? '#22c55e' : i + 1 === step ? '#f59e0b' : '#1e293b',
                color: i + 1 <= step ? 'white' : '#64748b',
                transform: i + 1 === step ? 'scale(1.15)' : 'scale(1)',
                boxShadow: i + 1 === step ? '0 0 12px rgba(245,158,11,0.6)' : 'none',
              }}
            >
              {i + 1 < step ? '✓' : s.id}
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex:1, height:2, background: i + 1 < step ? '#22c55e' : '#1e293b', transition:'background 0.4s', minWidth:6 }}/>
            )}
          </React.Fragment>
        ))}

        {/* Controls */}
        <div style={{ marginLeft:10, display:'flex', gap:8, alignItems:'center', flexShrink:0 }}>
          {step === 0 && (
            <button onClick={start} style={{ background:'#f59e0b', color:'#000', fontWeight:700, padding:'4px 14px', borderRadius:8, border:'none', fontSize:12, cursor:'pointer' }}>▶ START</button>
          )}
          {step > 0 && !done && running && (
            <button onClick={pause} style={{ background:'#334155', color:'#e2e8f0', padding:'4px 12px', borderRadius:8, border:'1px solid #475569', fontSize:12, cursor:'pointer' }}>⏸ PAUSE</button>
          )}
          {step > 0 && !done && !running && (
            <button onClick={resume} style={{ background:'#f59e0b', color:'#000', fontWeight:700, padding:'4px 12px', borderRadius:8, border:'none', fontSize:12, cursor:'pointer' }}>▶ RESUME</button>
          )}
          {step > 0 && (
            <button onClick={reset} style={{ background:'transparent', color:'#64748b', padding:'4px 10px', borderRadius:8, border:'1px solid #334155', fontSize:11, cursor:'pointer' }}>↺ Reset</button>
          )}
          <button onClick={onClose} style={{ background:'transparent', color:'#94a3b8', border:'none', fontSize:18, cursor:'pointer', lineHeight:1 }}>✕</button>
        </div>
      </div>

      {/* BOTTOM CARD */}
      {currentStep && !done && (
        <div
          className="animate-slide-up"
          style={{ position:'absolute', bottom:24, left:'50%', transform:'translateX(-50%)', width:600, maxWidth:'90vw', pointerEvents:'auto', background:'rgba(15,23,42,0.96)', border:'1px solid #334155', borderRadius:16, padding:'16px 20px', backdropFilter:'blur(14px)', boxShadow:'0 20px 60px rgba(0,0,0,0.6)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
            <span style={{ fontSize:24 }}>{currentStep.icon}</span>
            <div>
              <div style={{ fontSize:9, color:'#64748b', fontFamily:'monospace', letterSpacing:1 }}>STEP {step}/10</div>
              <div style={{ fontSize:16, fontWeight:700, color:'#e2e8f0' }}>{currentStep.title}</div>
            </div>
            <div style={{ marginLeft:'auto', fontSize:9, color:'#475569' }}>{Math.round((step/STEPS.length)*100)}% complete</div>
          </div>
          <div style={{ fontSize:13, color:'#f59e0b', fontWeight:600, marginBottom:4 }}>{currentStep.sub}</div>
          <div style={{ fontSize:11, color:'#64748b', lineHeight:1.5 }}>{currentStep.detail}</div>
          {/* progress bar */}
          <div style={{ marginTop:12, height:3, background:'#1e293b', borderRadius:2 }}>
            <div style={{ height:'100%', width:`${(step/STEPS.length)*100}%`, background:'linear-gradient(90deg,#f59e0b,#ef4444)', borderRadius:2, transition:'width 0.6s ease' }}/>
          </div>
        </div>
      )}

      {/* IMPACT badge at step 10 */}
      {done && (
        <div
          className="animate-bounce-in"
          style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', textAlign:'center', pointerEvents:'none' }}>
          <div style={{ fontSize:72, fontWeight:900, color:'#22c55e', lineHeight:1, textShadow:'0 0 40px rgba(34,197,94,0.8)', animation:'bounce 1s ease infinite' }}>−27%</div>
          <div style={{ color:'white', fontSize:20, fontWeight:700, marginTop:8 }}>Wait time reduced</div>
          <div style={{ color:'#94a3b8', fontSize:14, marginTop:4 }}>22 min → 16 min • Response: 11 min</div>
          <div style={{ marginTop:16, display:'flex', gap:12, justifyContent:'center' }}>
            {[{l:'Wait Time',v:'−27%'},{l:'Bunching',v:'−67%'},{l:'Response',v:'11 min'}].map(m=>(
              <div key={m.l} style={{ background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.3)', borderRadius:10, padding:'10px 16px' }}>
                <div style={{ fontSize:11, color:'#64748b' }}>{m.l}</div>
                <div style={{ fontSize:18, fontWeight:700, color:'#22c55e' }}>{m.v}</div>
              </div>
            ))}
          </div>
          <button onClick={reset} style={{ marginTop:20, background:'#f59e0b', color:'#000', fontWeight:700, padding:'8px 24px', borderRadius:10, border:'none', fontSize:13, cursor:'pointer', pointerEvents:'auto' }}>↺ Replay Demo</button>
        </div>
      )}
    </div>
  );
}
