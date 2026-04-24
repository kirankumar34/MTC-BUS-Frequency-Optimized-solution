import { useState, useEffect, useRef } from 'react'

const API = 'http://localhost:8000'

export default function SearchBar({ onSelectStop, onSelectRoute }) {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState({ stops: [], routes: [] })
  const [isOpen, setIsOpen]   = useState(false)
  const debounce              = useRef(null)

  useEffect(() => {
    if (!query.trim()) { setIsOpen(false); return }
    clearTimeout(debounce.current)
    debounce.current = setTimeout(async () => {
      try {
        const data = await fetch(
          `${API}/api/search?q=${encodeURIComponent(query)}`
        ).then(r => r.json())
        setResults(data)
        setIsOpen(true)
      } catch {
        setResults({ stops: [], routes: [] })
      }
    }, 300)
  }, [query])

  const clear = () => { setQuery(''); setIsOpen(false) }

  return (
    <div style={{ position: 'relative' }}>
      {/* Input box */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(59,130,246,0.3)', borderRadius: '16px',
        padding: '10px 16px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}>
        <span style={{ fontSize: '16px', flexShrink: 0 }}>🔍</span>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search stops or bus routes... (e.g. BROADWAY, 23C)"
          style={{
            background: 'transparent', border: 'none', outline: 'none',
            color: '#e2e8f0', fontSize: '13px', flex: 1, minWidth: 0,
          }}
        />
        {query && (
          <button onClick={clear} style={{
            background: 'none', border: 'none', color: '#64748b',
            cursor: 'pointer', fontSize: '14px', padding: 0,
          }}>✕</button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (results.stops.length > 0 || results.routes.length > 0) && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 9999,
          background: 'rgba(10,17,35,0.98)', backdropFilter: 'blur(16px)',
          border: '1px solid #1e3a5f', borderRadius: '16px',
          overflow: 'hidden', boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
        }}>
          {results.routes.length > 0 && (
            <div>
              <div style={{
                padding: '6px 14px', fontSize: '9px', color: '#475569',
                textTransform: 'uppercase', letterSpacing: '1.5px',
                borderBottom: '1px solid #1e293b',
              }}>Routes</div>
              {results.routes.map(r => (
                <button key={r.route_id}
                  onClick={() => { onSelectRoute(r); clear() }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    width: '100%', padding: '10px 14px',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    textAlign: 'left', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{
                    background: '#eab308', color: '#000',
                    fontWeight: 700, fontSize: '11px',
                    padding: '2px 7px', borderRadius: '5px',
                  }}>{r.route_id}</span>
                  <span style={{ color: '#94a3b8', fontSize: '12px' }}>{r.stop_count} stops</span>
                </button>
              ))}
            </div>
          )}
          {results.stops.length > 0 && (
            <div>
              <div style={{
                padding: '6px 14px', fontSize: '9px', color: '#475569',
                textTransform: 'uppercase', letterSpacing: '1.5px',
                borderBottom: '1px solid #1e293b', borderTop: results.routes.length > 0 ? '1px solid #1e293b' : 'none',
              }}>Bus Stops</div>
              {results.stops.map(s => (
                <button key={s.name}
                  onClick={() => { onSelectStop(s); clear() }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    width: '100%', padding: '10px 14px',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    textAlign: 'left', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ fontSize: '14px', flexShrink: 0 }}>🚏</span>
                  <div>
                    <div style={{ color: '#e2e8f0', fontSize: '12px', fontWeight: 500 }}>{s.name}</div>
                    <div style={{ color: '#64748b', fontSize: '10px' }}>
                      {s.lat?.toFixed(4)}°N, {s.lng?.toFixed(4)}°E
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
