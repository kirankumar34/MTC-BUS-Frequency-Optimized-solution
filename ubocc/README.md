# Chennai U-BOCC

## AI-Powered Bus Frequency Optimization & Smart Transport Command System

> Built for the MTC Chennai Hackathon — PS19

---

## Quick Start (3 commands)

### Terminal 1 — Backend

```bash
cd backend
pip install -r requirements.txt
python seed_data.py
uvicorn main:app --reload
```

### Terminal 2 — Frontend

```bash
cd frontend
npm install
npm run dev
```

Open: **<http://localhost:8080>**

---

## Gemini API Key

1. Get a free key at <https://aistudio.google.com/>
2. Open `backend/.env`
3. Replace `your_gemini_api_key_here` with your key:

```env
GEMINI_API_KEY=AIza...your_key_here
```

> **Note:** The app works without a Gemini key — it uses realistic fallback responses for demo purposes.

---

## Architecture

```text
/ubocc
  /backend          — FastAPI + SQLite + Gemini
    main.py         — All API endpoints
    models.py       — SQLAlchemy models
    seed_data.py    — Load CSVs into SQLite
    gemini_engine.py — Gemini AI integration
    requirements.txt
    .env            — API keys + DB URL

  /frontend         — React + Vite + Tailwind + Leaflet
    src/
      App.jsx                      — Router + sidebar
      api.js                       — Axios API client
      components/
        CommandDashboard.jsx       — Screen 1: Live map
        FrequencyOptimizer.jsx     — Screen 2: AI optimizer
        IncidentManager.jsx        — Screen 3: Incidents
        PassengerAlerts.jsx        — Screen 4: Passenger view

  /data             — All synthetic CSV datasets
    routes_master.csv
    stops_master.csv
    depots_master.csv
    incidents.csv
    dispatch_actions.csv
    passenger_alerts.csv
```

---

## Demo Scenario (60 seconds)

1. **Dashboard** — Real Chennai map with 15 animated live buses
2. **Optimizer** → Select Route 23C → Set condition "IPL Match Day" → Click "Run AI Optimization"
3. Click **Approve & Dispatch** → Watch depot alert + driver SMS appear
4. **Incidents** → Click **"Simulate IPL + Rain Scenario"**
   - Watch the 10-step automated response unfold (2.5s per step)
   - Detection → AI recommendation → Officer approval → Depot dispatch → Driver alerts → Passenger notifications
5. **Passengers** → See bilingual (Tamil + English) alerts + before/after impact table

---

## What Judges Will See in 60 seconds

| # | Feature | Where |
| --- | ------- | ----- |
| 1 | Real Chennai map with animated buses | Dashboard |
| 2 | IPL Tonight banner with live event data | Dashboard |
| 3 | 2 active incidents (red indicators on map) | Dashboard |
| 4 | AI Gemini recommendation card | Dashboard / Optimizer |
| 5 | Officer approval → depot action flow | Optimizer |
| 6 | Tamil + English bilingual alerts | Passengers |
| 7 | Before/After impact metrics | Passengers |

---

## Data Sources

- MTC Official: mtcbus.tn.gov.in
- IPL 2025 CSK schedule: chennaisuperkings.com
- Stop coordinates: OpenStreetMap Chennai
- Weather patterns: IMD Chennai
- Fleet data: Wikipedia MTC Chennai

---

## Tech Stack

| Layer | Technology |
| ----- | ---------- |
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS v3 |
| Maps | Leaflet.js + OpenStreetMap |
| Charts | Recharts |
| Backend | Python FastAPI |
| Database | SQLite via SQLAlchemy |
| AI | Google Gemini 1.5 Flash |
| Animation | CSS animations + React state |

---

### About

Chennai U-BOCC — Building smarter transit for 5.09 million daily passengers
