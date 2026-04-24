import { useState, useEffect, useRef } from 'react'
import { fetchAlerts, fetchStops } from '../api'

const STOP_DISPLAY_BOARDS = {
  S001: {
    stop_name: 'Broadway Bus Terminus',
    stop_name_tamil: 'பிராட்வே பேருந்து நிலையம்',
    buses: [
      { route: '23C', dest: 'Tambaram', dest_t: 'தாம்பரம்', eta: 8, status: 'moderate', status_t: 'மிதமான நெரிசல்', occ: 72 },
      { route: '21G', dest: 'Tambaram', dest_t: 'தாம்பரம்', eta: 12, status: 'available', status_t: 'இடம் உள்ளது', occ: 38 },
      { route: '9', dest: 'Thiruvotriyur', dest_t: 'திருவொற்றியூர்', eta: 5, status: 'crowded', status_t: 'நிரம்பியுள்ளது', occ: 95 },
      { route: '70', dest: 'Tambaram', dest_t: 'தாம்பரம்', eta: 18, status: 'available', status_t: 'இடம் உள்ளது', occ: 42 },
    ]
  },
  S002: {
    stop_name: 'Chennai Central Railway Station',
    stop_name_tamil: 'சென்னை சென்ட்ரல் ரயில் நிலையம்',
    buses: [
      { route: '23C', dest: 'Tambaram', dest_t: 'தாம்பரம்', eta: 14, status: 'moderate', status_t: 'மிதமான நெரிசல்', occ: 65 },
      { route: '29C', dest: 'Velachery', dest_t: 'வேளச்சேரி', eta: 6, status: 'diverted', status_t: 'வேறு வழியில் செல்கிறது', occ: 55 },
      { route: '9', dest: 'Thiruvotriyur', dest_t: 'திருவொற்றியூர்', eta: 9, status: 'crowded', status_t: 'நிரம்பியுள்ளது', occ: 88 },
    ]
  },
  S012: {
    stop_name: 'Chepauk Bus Stop',
    stop_name_tamil: 'சேப்பாக்கம் பேருந்து நிறுத்தம்',
    buses: [
      { route: '23C', dest: 'Tambaram', dest_t: 'தாம்பரம்', eta: 15, status: 'crowded', status_t: 'நிரம்பியுள்ளது', occ: 110 },
      { route: '21G', dest: 'Tambaram', dest_t: 'தாம்பரம்', eta: 7, status: 'extra', status_t: 'கூடுதல் பேருந்து', occ: 35 },
      { route: '9', dest: 'Thiruvotriyur', dest_t: 'திருவொற்றியூர்', eta: 4, status: 'crowded', status_t: 'நிரம்பியுள்ளது', occ: 100 },
    ]
  },
  S009: {
    stop_name: 'Velachery Bus Terminus',
    stop_name_tamil: 'வேளச்சேரி பேருந்து நிலையம்',
    buses: [
      { route: '29C', dest: 'Central', dest_t: 'சென்ட்ரல்', eta: 22, status: 'diverted', status_t: 'வேறு வழியில் செல்கிறது', occ: 110 },
      { route: 'M15', dest: 'Tambaram East', dest_t: 'தாம்பரம் கிழக்கு', eta: 10, status: 'available', status_t: 'இடம் உள்ளது', occ: 45 },
    ]
  },
  S007: {
    stop_name: 'Adyar Bus Stand',
    stop_name_tamil: 'அடையாறு பேருந்து நிலையம்',
    buses: [
      { route: '19B', dest: 'Sholinganallur', dest_t: 'சோழிங்கநல்லூர்', eta: 8, status: 'available', status_t: 'இடம் உள்ளது', occ: 62 },
      { route: '21G', dest: 'Broadway', dest_t: 'பிராட்வே', eta: 5, status: 'extra', status_t: 'கூடுதல் பேருந்து', occ: 30 },
      { route: '47B', dest: 'Villivakkam', dest_t: 'வில்லிவாக்கம்', eta: 15, status: 'available', status_t: 'இடம் உள்ளது', occ: 55 },
    ]
  },
}

const OCC_INFO = {
  available: { color: '#22C55E', dot: '🟢', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)' },
  moderate: { color: '#F59E0B', dot: '🟡', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
  crowded: { color: '#EF4444', dot: '🔴', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)' },
  diverted: { color: '#A855F7', dot: '🟣', bg: 'rgba(168,85,247,0.1)', border: 'rgba(168,85,247,0.3)' },
  extra: { color: '#3B82F6', dot: '🔵', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)' },
}

const BEFORE_AFTER = [
  ['Avg wait time', '22 min', '16 min', '-27%'],
  ['Buses bunching', '4 incidents/day', '1 incident/day', '-75%'],
  ['Incident response', '28 min', '8 min', '-71%'],
  ['Passenger info', 'None', 'Real-time bilingual', '∞'],
  ['Depot coordination', 'Phone calls', 'Instant digital', '∞'],
  ['Driver alerts', 'Radio/Manual', 'Digital SMS', '∞'],
  ['Overloaded detection', 'Reported late', 'Detected early', '-67%'],
]

const TICKER_ALERTS = [
  '🔴 23C DELAYED at Chepauk — IPL crowd surge — use 21G via Marina',
  '🟣 29C DIVERTED via Pallikaranai Road — Velachery Bypass flooded',
  '🟢 3 extra 21G buses deployed — Broadway to Tambaram — seats available',
  '🟡 Route 9 — Heavy traffic on Wallajah Road — expect 10 min delay',
  '🔵 Free MTC travel for IPL ticket holders — Routes 23C, 21G, 9',
]

export default function PassengerAlerts() {
  const [alerts, setAlerts] = useState([])
  const [selectedStop, setSelectedStop] = useState('S001')
  const [tickerIdx, setTickerIdx] = useState(0)
  const [etaCounters, setEtaCounters] = useState({})
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    fetchAlerts().then(r => setAlerts(r.data)).catch(() => {})
    const t = setInterval(() => {
      setTickerIdx(i => (i + 1) % TICKER_ALERTS.length)
      setNow(new Date())
    }, 4000)
    return () => clearInterval(t)
  }, [])

  const board = STOP_DISPLAY_BOARDS[selectedStop]

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        background: '#0f1929', borderBottom: '1px solid #1e3a5f',
        padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0
      }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#E2E8F0' }}>📣 PASSENGER ALERT CENTER</div>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: '10px', color: '#A855F7' }}>🌐 Tamil | English</span>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22C55E', animation: 'blink 1.5s ease infinite' }} />
        <span style={{ fontSize: '10px', color: '#22C55E' }}>LIVE</span>
      </div>

      {/* Ticker */}
      <div style={{
        background: '#0f1929', borderBottom: '1px solid #1e3a5f',
        padding: '6px 0', overflow: 'hidden', flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
          <div style={{
            background: '#EF4444', color: 'white', padding: '3px 10px',
            fontSize: '10px', fontWeight: 700, flexShrink: 0
          }}>LIVE ALERTS</div>
          <div style={{
            flex: 1, overflow: 'hidden', padding: '0 12px',
            fontSize: '11px', color: '#E2E8F0',
            animation: `slide-in-right 0.5s ease`,
            key: tickerIdx
          }}>
            {TICKER_ALERTS[tickerIdx]}
          </div>
          <div style={{
            background: '#1E293B', border: '1px solid #334155', color: '#64748B',
            padding: '3px 10px', fontSize: '9px', flexShrink: 0
          }}>
            {now.toLocaleTimeString('en-IN', { hour12: false })}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left: Stop selector + display board */}
        <div style={{ width: '420px', minWidth: '420px', borderRight: '1px solid #1e3a5f',
          display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0a0f1e' }}>

          {/* Stop selector */}
          <div style={{ padding: '12px', borderBottom: '1px solid #1e3a5f', flexShrink: 0 }}>
            <label style={{ display: 'block', fontSize: '10px', color: '#94A3B8', marginBottom: '5px', textTransform: 'uppercase' }}>Select Bus Stop</label>
            <select value={selectedStop} onChange={e => setSelectedStop(e.target.value)}
              style={{
                width: '100%', background: '#1E293B', border: '1px solid #334155',
                color: '#E2E8F0', borderRadius: '6px', padding: '8px 10px',
                fontSize: '12px', cursor: 'pointer'
              }}>
              {Object.entries(STOP_DISPLAY_BOARDS).map(([id, b]) => (
                <option key={id} value={id}>{b.stop_name}</option>
              ))}
            </select>
          </div>

          {/* Display board */}
          {board && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
              {/* Board header */}
              <div style={{
                background: 'linear-gradient(135deg, #1E293B 0%, #0f1d30 100%)',
                border: '1px solid #334155', borderRadius: '8px', padding: '12px', marginBottom: '10px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#E2E8F0' }}>{board.stop_name}</div>
                    <div style={{ fontSize: '12px', color: '#A855F7', marginTop: '2px' }}>{board.stop_name_tamil}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>Updated</div>
                    <div style={{ fontSize: '12px', color: '#F59E0B', fontFamily: 'JetBrains Mono, monospace' }}>
                      {now.toLocaleTimeString('en-IN', { hour12: false })}
                    </div>
                  </div>
                </div>

                {/* Bus table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #334155' }}>
                      <th style={{ padding: '5px 6px', textAlign: 'left', color: '#64748B', fontSize: '9px', textTransform: 'uppercase' }}>Route</th>
                      <th style={{ padding: '5px 6px', textAlign: 'left', color: '#64748B', fontSize: '9px', textTransform: 'uppercase' }}>Destination</th>
                      <th style={{ padding: '5px 6px', textAlign: 'center', color: '#64748B', fontSize: '9px', textTransform: 'uppercase' }}>ETA</th>
                      <th style={{ padding: '5px 6px', textAlign: 'left', color: '#64748B', fontSize: '9px', textTransform: 'uppercase' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {board.buses.map((bus, idx) => {
                      const info = OCC_INFO[bus.status] || OCC_INFO.available
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #1e3a5f' }}>
                          <td style={{ padding: '7px 6px', fontWeight: 700, color: '#F59E0B', fontFamily: 'JetBrains Mono, monospace' }}>{bus.route}</td>
                          <td style={{ padding: '7px 6px' }}>
                            <div style={{ color: '#E2E8F0', fontWeight: 600 }}>{bus.dest}</div>
                            <div style={{ color: '#A855F7', fontSize: '10px' }}>{bus.dest_t}</div>
                          </td>
                          <td style={{ padding: '7px 6px', textAlign: 'center' }}>
                            <div style={{
                              fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '14px',
                              color: bus.eta <= 5 ? '#22C55E' : bus.eta <= 10 ? '#F59E0B' : '#94A3B8'
                            }}>{bus.eta} min</div>
                          </td>
                          <td style={{ padding: '7px 6px' }}>
                            <div style={{
                              display: 'inline-flex', alignItems: 'center', gap: '4px',
                              padding: '2px 7px', borderRadius: '4px',
                              background: info.bg, border: `1px solid ${info.border}`
                            }}>
                              <span>{info.dot}</span>
                              <div>
                                <div style={{ fontSize: '10px', color: info.color, fontWeight: 600 }}>{bus.status}</div>
                                <div style={{ fontSize: '9px', color: '#64748B' }}>{bus.status_t}</div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Occupancy bar visualization */}
              <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '8px', padding: '10px', marginBottom: '10px' }}>
                <div style={{ fontSize: '10px', color: '#64748B', textTransform: 'uppercase', marginBottom: '8px' }}>Occupancy Levels</div>
                {board.buses.map((bus, i) => {
                  const pct = Math.min(bus.occ, 130)
                  const color = pct > 100 ? '#EF4444' : pct > 75 ? '#F97316' : '#22C55E'
                  return (
                    <div key={i} style={{ marginBottom: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94A3B8', marginBottom: '3px' }}>
                        <span>{bus.route} → {bus.dest}</span>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', color }}>{pct}%</span>
                      </div>
                      <div style={{ height: '6px', background: '#0B1120', borderRadius: '3px' }}>
                        <div style={{
                          height: '100%', width: `${Math.min(pct, 100)}%`,
                          background: color, borderRadius: '3px',
                          transition: 'width 0.5s ease'
                        }} />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Active alerts for this stop */}
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '8px' }}>
                Active Alerts at This Stop
              </div>
              {alerts.filter(a => a.stop_id === selectedStop || !a.stop_id).slice(0, 3).map(alert => (
                <div key={alert.alert_id} style={{
                  background: '#1E293B', border: '1px solid #334155',
                  borderLeft: `3px solid ${alert.severity === 'High' ? '#EF4444' : '#F97316'}`,
                  borderRadius: '6px', padding: '10px', marginBottom: '8px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#E2E8F0' }}>{alert.alert_type}</span>
                    <span style={{ fontSize: '9px', color: '#64748B' }}>{alert.issued_time?.slice(11, 16)}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '6px', lineHeight: '1.5' }}>
                    {alert.message_english}
                  </div>
                  <div style={{
                    fontSize: '12px', color: '#A855F7', lineHeight: '1.5',
                    borderTop: '1px solid #1e3a5f', paddingTop: '6px'
                  }}>
                    {alert.message_tamil}
                  </div>
                </div>
              ))}
              {alerts.length === 0 && (
                <div style={{ fontSize: '11px', color: '#475569', textAlign: 'center', padding: '20px' }}>
                  No active alerts for this stop
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: All alerts + before/after panel */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px', background: '#0B1120' }}>
          {/* All alerts */}
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '10px' }}>
            📣 All Active Passenger Alerts
          </div>

          {alerts.map(alert => (
            <div key={alert.alert_id} style={{
              background: '#1E293B', border: '1px solid #334155',
              borderLeft: `3px solid ${alert.severity === 'High' ? '#EF4444' : alert.severity === 'Medium' ? '#F97316' : '#F59E0B'}`,
              borderRadius: '8px', padding: '14px', marginBottom: '10px',
              animation: 'slide-in-up 0.3s ease-out'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <span style={{
                    padding: '2px 6px', borderRadius: '3px', fontSize: '9px', fontWeight: 700,
                    background: 'rgba(59,130,246,0.15)', color: '#60A5FA', border: '1px solid rgba(59,130,246,0.3)',
                    marginRight: '6px'
                  }}>{alert.route_id}</span>
                  <span style={{
                    padding: '2px 6px', borderRadius: '3px', fontSize: '9px', fontWeight: 700,
                    background: 'rgba(245,158,11,0.15)', color: '#FCD34D', border: '1px solid rgba(245,158,11,0.3)'
                  }}>{alert.alert_type}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '9px', color: '#64748B' }}>{alert.issued_time?.slice(11, 16)}</div>
                  <div style={{ fontSize: '9px', color: alert.severity === 'High' ? '#F87171' : '#FB923C' }}>{alert.severity}</div>
                </div>
              </div>

              {/* English */}
              <div style={{
                background: '#0B1120', borderRadius: '5px', padding: '8px',
                fontSize: '12px', color: '#CBD5E1', marginBottom: '8px', lineHeight: '1.5'
              }}>
                🇬🇧 {alert.message_english}
              </div>

              {/* Tamil */}
              <div style={{
                background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)',
                borderRadius: '5px', padding: '8px',
                fontSize: '13px', color: '#C084FC', lineHeight: '1.6'
              }}>
                🏴 {alert.message_tamil}
              </div>

              <div style={{ marginTop: '8px', display: 'flex', gap: '6px' }}>
                {alert.channel?.split('_').map(c => (
                  <span key={c} style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '3px', background: '#1e3a5f', color: '#64748B' }}>
                    {c === 'display' ? '📺 Display' : c === 'app' ? '📱 App' : c === 'sms' ? '💬 SMS' : c}
                  </span>
                ))}
              </div>
            </div>
          ))}

          {/* Before/After comparison panel */}
          <div style={{
            background: 'linear-gradient(135deg, #1E293B 0%, #0f1d30 100%)',
            border: '1px solid #334155', borderRadius: '8px', padding: '16px', marginTop: '8px'
          }}>
            <div style={{
              fontSize: '12px', fontWeight: 700, color: '#F59E0B', marginBottom: '12px', textAlign: 'center',
              textTransform: 'uppercase', letterSpacing: '1px'
            }}>
              📊 U-BOCC IMPACT — IPL MATCH DAY COMPARISON
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #334155' }}>
                  <th style={{ padding: '8px', textAlign: 'left', color: '#64748B', fontSize: '10px', textTransform: 'uppercase' }}>Metric</th>
                  <th style={{ padding: '8px', textAlign: 'center', color: '#EF4444', fontSize: '10px', textTransform: 'uppercase' }}>Before U-BOCC</th>
                  <th style={{ padding: '8px', textAlign: 'center', color: '#22C55E', fontSize: '10px', textTransform: 'uppercase' }}>After U-BOCC</th>
                  <th style={{ padding: '8px', textAlign: 'center', color: '#60A5FA', fontSize: '10px', textTransform: 'uppercase' }}>Impact</th>
                </tr>
              </thead>
              <tbody>
                {BEFORE_AFTER.map(([metric, before, after, pct], i) => (
                  <tr key={metric} style={{ borderBottom: '1px solid #1e3a5f', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                    <td style={{ padding: '9px 8px', color: '#94A3B8', fontWeight: 500 }}>{metric}</td>
                    <td style={{ padding: '9px 8px', textAlign: 'center', color: '#F87171', fontFamily: 'JetBrains Mono, monospace', textDecoration: 'line-through', fontSize: '12px' }}>{before}</td>
                    <td style={{ padding: '9px 8px', textAlign: 'center', color: '#4ADE80', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '13px' }}>{after}</td>
                    <td style={{ padding: '9px 8px', textAlign: 'center' }}>
                      <span style={{
                        padding: '2px 7px', borderRadius: '4px', fontSize: '10px', fontWeight: 700,
                        background: pct.startsWith('-') ? 'rgba(34,197,94,0.15)' : 'rgba(59,130,246,0.15)',
                        color: pct.startsWith('-') ? '#4ADE80' : '#60A5FA'
                      }}>{pct}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
