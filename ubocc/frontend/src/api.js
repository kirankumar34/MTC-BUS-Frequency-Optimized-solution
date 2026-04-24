import axios from 'axios'

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  timeout: 30000,
})

export const fetchBuses = () => API.get('/api/buses/live')
export const fetchRoutes = () => API.get('/api/routes')
export const fetchStops = () => API.get('/api/stops')
export const fetchDepots = () => API.get('/api/depots')
export const fetchIncidents = () => API.get('/api/incidents')
export const fetchEvents = () => API.get('/api/events')
export const fetchKPIs = () => API.get('/api/kpis')
export const fetchAlerts = () => API.get('/api/alerts')
export const fetchDispatch = () => API.get('/api/dispatch')
export const fetchRoadSegments = () => API.get('/api/road_segments')

export const approveDispatch = (action_id, officer_name = 'Karthik Kumar') =>
  API.post('/api/dispatch/approve', { action_id, officer_name })
export const rejectDispatch = (action_id) =>
  API.post('/api/dispatch/reject', { action_id })

export const runAIOptimize = (payload) =>
  API.post('/api/ai/optimize', payload)
export const runAIReroute = (incident_id) =>
  API.post('/api/ai/reroute', { incident_id })

export const triggerIPLRainScenario = () =>
  API.post('/api/scenario/ipl_rain')

export const updateKPIs = (wait_time, bunching, alerts) =>
  API.post(`/api/scenario/update_kpis?wait_time=${wait_time}&bunching=${bunching}&alerts=${alerts}`)

export default API
