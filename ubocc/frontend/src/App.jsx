import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import CommandDashboard from './components/CommandDashboard'
import FrequencyOptimizer from './components/FrequencyOptimizer'
import IncidentManager from './components/IncidentManager'
import PassengerAlerts from './components/PassengerAlerts'
import LiveMapView from './components/LiveMapView'
import { fetchKPIs } from './api'
import './index.css'

const NAV_ITEMS = [
  { path: '/', label: 'Command Dashboard', icon: '📡', short: 'Dashboard' },
  { path: '/livemap', label: 'Live Bus Map', icon: '🗺️', short: 'Live Map' },
  { path: '/optimizer', label: 'AI Frequency Optimizer', icon: '🤖', short: 'Optimizer' },
  { path: '/incidents', label: 'Incident & Reroute', icon: '⚠️', short: 'Incidents' },
  { path: '/passengers', label: 'Passenger Alerts', icon: '📣', short: 'Passengers' },
]

function Sidebar() {
  const now = new Date()
  const [time, setTime] = useState(now)
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <aside style={{
      width: '220px', minWidth: '220px', background: '#0f1929',
      borderRight: '1px solid #1e3a5f', display: 'flex', flexDirection: 'column',
      height: '100vh', overflow: 'hidden'
    }}>
      {/* Logo */}
      <div style={{ padding: '16px 14px 12px', borderBottom: '1px solid #1e3a5f' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #e63946 0%, #c1121f 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px', flexShrink: 0
          }}>🚌</div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#E2E8F0', letterSpacing: '0.5px' }}>U-BOCC</div>
            <div style={{ fontSize: '9px', color: '#64748b', letterSpacing: '1px', textTransform: 'uppercase' }}>Chennai MTC</div>
          </div>
        </div>
        <div style={{ fontSize: '9px', color: '#475569', fontFamily: 'JetBrains Mono, monospace', marginTop: '6px' }}>
          {time.toLocaleTimeString('en-IN', { hour12: false })} IST — LIVE
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22C55E', animation: 'blink 1.5s ease infinite' }}></div>
          <span style={{ fontSize: '10px', color: '#22C55E' }}>System Operational</span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '8px 8px', overflowY: 'auto' }}>
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '9px 10px', borderRadius: '6px', marginBottom: '2px',
              textDecoration: 'none', cursor: 'pointer', transition: 'all 0.15s',
              background: isActive ? 'rgba(59,130,246,0.12)' : 'transparent',
              borderLeft: isActive ? '2px solid #3B82F6' : '2px solid transparent',
              color: isActive ? '#60A5FA' : '#94A3B8',
            })}
          >
            <span style={{ fontSize: '14px' }}>{item.icon}</span>
            <span style={{ fontSize: '11px', fontWeight: 500 }}>{item.short}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer info */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid #1e3a5f', fontSize: '9px', color: '#334155' }}>
        <div style={{ marginBottom: '2px' }}>MTC Tamil Nadu © 2025</div>
        <div>Fleet: 3,376 buses | 668 routes</div>
        <div>5.09M passengers/day</div>
      </div>
    </aside>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#0B1120' }}>
        <Sidebar />
        <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <Routes>
            <Route path="/" element={<CommandDashboard />} />
            <Route path="/livemap" element={<LiveMapView />} />
            <Route path="/optimizer" element={<FrequencyOptimizer />} />
            <Route path="/incidents" element={<IncidentManager />} />
            <Route path="/passengers" element={<PassengerAlerts />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
