import { useState, useEffect, useRef } from 'react'
import { fetchIncidents, triggerIPLRainScenario, approveDispatch, fetchDispatch, updateKPIs } from '../api'

const SCENARIO_STEPS = [
  {
    id: 1, icon: '🏏', title: 'EVENT DETECTED',
    lines: [
      'CSK vs MI IPL match at MA Chidambaram Stadium, Chepauk',
      'Expected attendance: 37,505 | Match starts: 19:30',
      'Est. dispersal: 22:00–22:45 | Free MTC travel for ticket holders',
    ]
  },
  {
    id: 2, icon: '🌧️', title: 'WEATHER ALERT',
    lines: [
      'IMD Warning: Heavy rain in Chennai Central, T Nagar, Chepauk zones',
      'Rainfall: 35mm expected between 20:00–23:00',
      'Waterlogging risk: Velachery Bypass — HIGH | Saidapet underpass — MEDIUM',
    ]
  },
  {
    id: 3, icon: '🤖', title: 'AI PREDICTION ENGINE',
    lines: [
      'Route 23C: 340% demand surge predicted at Chepauk stop (22:00–22:45)',
      'Route 21G: 290% surge predicted at Marina Beach approach',
      'Route 29C: Velachery section BLOCKED — waterlogging risk imminent',
      'Route 9: Wallajah Road speed 6 km/h — critical congestion',
    ]
  },
  {
    id: 4, icon: '⚠️', title: 'PRIORITY SCORING',
    lines: [
      '🔴 CRITICAL: Chepauk crowd dispersal — 37,505 passengers',
      '🟠 HIGH: Velachery waterlogging — 3 routes affected (29C, M15)',
      '🟡 MEDIUM: Anna Salai congestion — evening peak overlap with 23C',
    ]
  },
  {
    id: 5, icon: '🤖', title: 'GEMINI RECOMMENDATION GENERATED',
    lines: [
      'Deploy 4 extra buses on Route 21G (Adyar Depot — ADR)',
      'Hold MTC-2303 at Saidapet for 10 min to clear Guindy congestion',
      'Divert 29C via Pallikaranai Road — bypass flooded Velachery',
      'Confidence: 0.91 | Urgency: CRITICAL | Response time needed: <15 min',
    ],
    isAI: true
  },
  {
    id: 6, icon: '👮', title: 'OFFICER APPROVAL',
    lines: [
      'Officer Karthik Kumar, Zone Control — reviewing recommendation...',
      '✓ APPROVED at 19:42:33 | Officer ID: OFF001',
      'All recommendations accepted. Depots notified.',
    ],
    isApproval: true
  },
  {
    id: 7, icon: '🏭', title: 'DEPOT DISPATCH',
    lines: [
      'Adyar Depot (ADR): DISPATCH 4 buses on Route 21G immediately',
      'T Nagar Depot (TNG): HOLD 2 spare buses on standby for surge',
      'Saidapet Depot (SPD): Reroute 29C drivers — new path briefed',
      'Buses deploying: MTC-2101, MTC-2103, MTC-2104, MTC-2105',
    ]
  },
  {
    id: 8, icon: '📱', title: 'DRIVER ALERTS SENT',
    lines: [
      'MTC-2303 → "Hold at Saidapet Bus Stop 10 min. Resume 19:52. Ack?"',
      'MTC-2901 (29C) → "ROUTE CHANGE: Skip Velachery Bypass. Use Pallikaranai Road. Ack?"',
      '✓ MTC-2303 Acknowledged 19:43 | ✓ MTC-2901 Acknowledged 19:44',
    ],
    isSMS: true
  },
  {
    id: 9, icon: '📣', title: 'PASSENGER ALERTS FIRED',
    lines: [
      '[Broadway] 3 extra 21G buses en route — wait max 8 min',
      '[Chepauk] Heavy crowd post-match. 23C delayed. Use 21G. Next bus: 7 min',
      '[Velachery] 29C DIVERTED. Via Pallikaranai Road. Extra time: 12 min',
    ],
    isBilingual: true
  },
  {
    id: 10, icon: '📊', title: 'DASHBOARD UPDATE',
    lines: [
      '✅ Wait time: 22 min → 16 min (−27%)',
      '✅ Bunching incidents: 3 → 1 (−67%)',
      '✅ Alerts sent: 4 → 7 (+3 new alerts)',
      '🏆 U-BOCC total response time: 11 minutes',
    ],
    isSuccess: true
  },
]

const INCIDENT_ICONS = {
  'Road Closure': '🚧',
  'Waterlogging': '🌧️',
  'Heavy Traffic': '🚦',
  'Bus Bunching': '🚌',
  'Crowd Surge': '👥',
  'Metro Work': '🚇',
}

const SEVERITY_COLORS = { High: '#EF4444', Medium: '#F97316', Low: '#F59E0B' }

function IncidentCard({ incident, onReroute }) {
  return (
    <div style={{
      background: '#1E293B', border: '1px solid #334155',
      borderLeft: `3px solid ${SEVERITY_COLORS[incident.severity] || '#64748B'}`,
      borderRadius: '8px', padding: '14px', marginBottom: '10px',
      animation: 'slide-in-up 0.3s ease-out'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#E2E8F0', marginBottom: '2px' }}>
            {INCIDENT_ICONS[incident.type] || '⚠️'} {incident.type}
          </div>
          <div style={{ fontSize: '11px', color: '#94A3B8' }}>{incident.location_name}</div>
        </div>
        <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
          <span style={{
            padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 700,
            background: `${SEVERITY_COLORS[incident.severity] || '#64748B'}22`,
            color: SEVERITY_COLORS[incident.severity] || '#94A3B8', border: `1px solid ${SEVERITY_COLORS[incident.severity] || '#64748B'}44`
          }}>{incident.severity}</span>
          <span style={{
            padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 700,
            background: incident.status === 'active' ? 'rgba(239,68,68,0.15)' :
              incident.status === 'predicted' ? 'rgba(165,85,247,0.15)' : 'rgba(245,158,11,0.15)',
            color: incident.status === 'active' ? '#F87171' : incident.status === 'predicted' ? '#C084FC' : '#FCD34D'
          }}>{incident.status.toUpperCase()}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '8px' }}>
        {incident.affected_routes?.split(';').map(r => (
          <span key={r} style={{
            padding: '2px 6px', borderRadius: '3px', fontSize: '10px',
            background: 'rgba(59,130,246,0.15)', color: '#60A5FA', border: '1px solid rgba(59,130,246,0.3)'
          }}>{r.trim()}</span>
        ))}
      </div>

      {incident.diversion_suggestion && (
        <div style={{
          background: '#0B1120', borderRadius: '4px', padding: '6px 8px',
          fontSize: '10px', color: '#94A3B8', marginBottom: '8px'
        }}>
          🔀 <span style={{ color: '#22C55E' }}>Diversion:</span> {incident.diversion_suggestion}
        </div>
      )}

      <div style={{ display: 'flex', gap: '6px' }}>
        <button onClick={() => onReroute(incident)}
          style={{
            flex: 1, padding: '5px', background: 'rgba(59,130,246,0.1)',
            border: '1px solid rgba(59,130,246,0.3)', borderRadius: '5px',
            color: '#60A5FA', fontSize: '10px', fontWeight: 600, cursor: 'pointer'
          }}>🤖 AI Reroute</button>
        <div style={{
          flex: 1, padding: '5px', textAlign: 'center',
          fontSize: '10px', color: '#64748B'
        }}>⏱ ~{Math.ceil(incident.estimated_duration_min / 60)}h duration</div>
      </div>
    </div>
  )
}

function ScenarioStep({ step, isActive, isCompleted }) {
  if (!isActive && !isCompleted) return null

  const bg = step.isSuccess ? 'rgba(34,197,94,0.08)' : step.isAI ? 'rgba(59,130,246,0.08)' :
    step.isApproval ? 'rgba(34,197,94,0.08)' : step.isSMS ? 'rgba(245,158,11,0.08)' : '#1E293B'
  const border = step.isSuccess ? 'rgba(34,197,94,0.3)' : step.isAI ? 'rgba(59,130,246,0.3)' :
    step.isApproval ? 'rgba(34,197,94,0.3)' : step.isSMS ? 'rgba(245,158,11,0.3)' : '#334155'

  return (
    <div style={{
      background: bg, border: `1px solid ${border}`,
      borderRadius: '8px', padding: '12px', marginBottom: '8px',
      animation: 'slide-in-up 0.5s ease-out',
      opacity: isCompleted ? 0.7 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ fontSize: '18px' }}>{step.icon}</span>
        <div>
          <div style={{ fontSize: '9px', color: '#64748B', fontFamily: 'JetBrains Mono, monospace' }}>
            STEP {step.id}/10
          </div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#E2E8F0' }}>{step.title}</div>
        </div>
        {isCompleted && <span style={{ marginLeft: 'auto', color: '#22C55E', fontSize: '14px' }}>✓</span>}
      </div>
      {step.lines.map((line, i) => (
        <div key={i} style={{
          fontSize: '11px', color: '#94A3B8', marginBottom: '3px', paddingLeft: '8px',
          borderLeft: '2px solid #334155', lineHeight: '1.5'
        }}>
          {step.isSMS ? (
            <span style={{ fontFamily: 'monospace', color: '#4ADE80' }}>{line}</span>
          ) : step.isBilingual && i % 2 === 1 ? (
            <span style={{ color: '#A855F7' }}>{line}</span>
          ) : line}
        </div>
      ))}
    </div>
  )
}

export default function IncidentManager() {
  const [incidents, setIncidents] = useState([])
  const [scenarioRunning, setScenarioRunning] = useState(false)
  const [scenarioStep, setScenarioStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState([])
  const [scenarioDone, setScenarioDone] = useState(false)
  const [scenarioData, setScenarioData] = useState(null)
  const [dispatchIds, setDispatchIds] = useState([])
  const stepTimer = useRef(null)

  useEffect(() => {
    fetchIncidents().then(r => setIncidents(r.data)).catch(() => {})
  }, [])

  const handleReroute = (incident) => {
    // Navigate user to see reroute — for now just alert
    alert(`AI Reroute for: ${incident.location_name}\nDiversion: ${incident.diversion_suggestion}`)
  }

  const runScenario = async () => {
    setScenarioRunning(true)
    setScenarioStep(1)
    setCompletedSteps([])
    setScenarioDone(false)

    // Trigger backend
    try {
      const res = await triggerIPLRainScenario()
      setScenarioData(res.data)
      setDispatchIds(res.data.new_dispatch_ids || [])
    } catch (e) {
      console.error('Scenario trigger failed:', e)
    }

    // Play through steps
    let step = 1
    const advance = () => {
      if (step >= SCENARIO_STEPS.length) {
        setScenarioDone(true)
        setScenarioRunning(false)
        // Update KPIs
        updateKPIs(16, 1, 7).catch(() => {})
        // Auto-approve dispatch actions
        fetchDispatch().then(r => {
          r.data.filter(d => d.status === 'pending').forEach(d => {
            approveDispatch(d.action_id).catch(() => {})
          })
        }).catch(() => {})
        return
      }
      setCompletedSteps(prev => [...prev, step])
      step++
      setScenarioStep(step)
      stepTimer.current = setTimeout(advance, 2500)
    }
    stepTimer.current = setTimeout(advance, 2500)
  }

  const resetScenario = () => {
    if (stepTimer.current) clearTimeout(stepTimer.current)
    setScenarioRunning(false)
    setScenarioStep(0)
    setCompletedSteps([])
    setScenarioDone(false)
    setScenarioData(null)
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        background: '#0f1929', borderBottom: '1px solid #1e3a5f',
        padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0
      }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#E2E8F0' }}>⚠️ INCIDENT & REROUTE MANAGER</div>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: '11px', color: '#64748B' }}>{incidents.length} active incidents</span>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Incident list */}
        <div style={{ width: '360px', minWidth: '360px', borderRight: '1px solid #1e3a5f',
          overflowY: 'auto', padding: '12px', background: '#0a0f1e' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase',
            letterSpacing: '1px', marginBottom: '10px' }}>Active Incidents</div>
          {incidents.map(i => <IncidentCard key={i.incident_id} incident={i} onReroute={handleReroute} />)}
        </div>

        {/* Scenario panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0B1120' }}>
          {/* Scenario button area */}
          <div style={{
            padding: '16px', borderBottom: '1px solid #1e3a5f', flexShrink: 0,
            background: '#0f1929'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#FCD34D', marginBottom: '2px' }}>
                  🏏🌧️ IPL + RAIN SCENARIO SIMULATOR
                </div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>
                  CSK vs MI at Chepauk + Heavy Rain in T Nagar — watch U-BOCC respond in real-time
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                {(scenarioDone || scenarioStep > 0) && (
                  <button onClick={resetScenario}
                    style={{
                      padding: '10px 16px', borderRadius: '6px',
                      background: 'rgba(100,116,139,0.15)', border: '1px solid #334155',
                      color: '#94A3B8', fontSize: '11px', fontWeight: 600, cursor: 'pointer'
                    }}>↺ Reset</button>
                )}
                <button
                  onClick={runScenario}
                  disabled={scenarioRunning}
                  style={{
                    padding: '10px 20px', borderRadius: '6px',
                    background: scenarioRunning
                      ? 'rgba(100,116,139,0.15)'
                      : 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
                    border: 'none',
                    color: scenarioRunning ? '#64748B' : '#0B1120',
                    fontSize: '12px', fontWeight: 700, cursor: scenarioRunning ? 'not-allowed' : 'pointer',
                    boxShadow: scenarioRunning ? 'none' : '0 0 20px rgba(239,68,68,0.4)',
                    animation: scenarioRunning ? 'none' : 'blink 2s ease infinite',
                  }}>
                  {scenarioRunning ? `⏳ Running... Step ${scenarioStep}/10` : '▶ SIMULATE IPL + RAIN SCENARIO'}
                </button>
              </div>
            </div>

            {/* Progress bar */}
            {(scenarioRunning || scenarioDone) && (
              <div style={{ marginTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#64748B', marginBottom: '4px' }}>
                  <span>Scenario Progress</span>
                  <span>{Math.round((completedSteps.length / SCENARIO_STEPS.length) * 100)}%</span>
                </div>
                <div style={{ height: '4px', background: '#1e3a5f', borderRadius: '2px' }}>
                  <div style={{
                    height: '100%',
                    width: `${(completedSteps.length / SCENARIO_STEPS.length) * 100}%`,
                    background: scenarioDone ? '#22C55E' : 'linear-gradient(90deg, #F59E0B, #EF4444)',
                    borderRadius: '2px',
                    transition: 'width 0.5s ease'
                  }} />
                </div>
              </div>
            )}
          </div>

          {/* Scenario steps */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
            {scenarioStep === 0 && !scenarioDone && (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏏🌧️</div>
                <div style={{ color: '#475569', fontSize: '14px', marginBottom: '8px', fontWeight: 600 }}>
                  Ready to simulate the Chepauk IPL + Rain scenario
                </div>
                <div style={{ color: '#334155', fontSize: '11px', lineHeight: '1.6' }}>
                  This demo will walk through all 10 steps of the U-BOCC response,<br />
                  from detection → AI recommendation → officer approval → driver alert → passenger notification.
                </div>
              </div>
            )}

            {SCENARIO_STEPS.map(step => (
              <ScenarioStep
                key={step.id}
                step={step}
                isActive={scenarioStep === step.id}
                isCompleted={completedSteps.includes(step.id)}
              />
            ))}

            {scenarioDone && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(34,197,94,0.1) 0%, rgba(59,130,246,0.1) 100%)',
                border: '1px solid rgba(34,197,94,0.3)', borderRadius: '8px', padding: '16px',
                textAlign: 'center', animation: 'slide-in-up 0.5s ease-out', marginTop: '8px'
              }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>🏆</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#4ADE80', marginBottom: '4px' }}>
                  Scenario Complete!
                </div>
                <div style={{ fontSize: '11px', color: '#22C55E', marginBottom: '12px' }}>
                  U-BOCC total response time: 11 minutes (vs 28 min manual)
                </div>

                {/* Before/After mini panel */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'left' }}>
                  {[
                    { metric: 'Wait Time', before: '22 min', after: '16 min', pct: '-27%' },
                    { metric: 'Bunching', before: '3 incidents', after: '1 incident', pct: '-67%' },
                    { metric: 'Response', before: '28 min', after: '11 min', pct: '-61%' },
                  ].map(m => (
                    <div key={m.metric} style={{ background: '#0B1120', borderRadius: '6px', padding: '10px' }}>
                      <div style={{ fontSize: '9px', color: '#64748B', textTransform: 'uppercase', marginBottom: '4px' }}>{m.metric}</div>
                      <div style={{ fontSize: '11px', color: '#64748B', textDecoration: 'line-through', marginBottom: '2px' }}>{m.before}</div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#4ADE80', fontFamily: 'JetBrains Mono, monospace' }}>{m.after}</div>
                      <div style={{ fontSize: '10px', color: '#22C55E', marginTop: '2px' }}>{m.pct}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
