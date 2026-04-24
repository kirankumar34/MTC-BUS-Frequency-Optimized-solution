# Chennai U-BOCC — Google Antigravity Build Prompt

## AI-Powered Bus Frequency Optimization & Smart Transport Command System

### Paste this ENTIRE file as your first message in Antigravity

---

## WHAT YOU ARE BUILDING

You are an expert full-stack engineer and urban transport systems architect.
Build **Chennai U-BOCC** (Unified Bus Operations Command Center) —
a production-grade, realistic web application for the MTC Chennai hackathon demo.

This is NOT a generic bus tracker. It is an **AI-powered operations command
system** — think NASA mission control, but for Chennai's 3,376 MTC buses.

Every piece of data in this prompt is REAL. Use it exactly as given.

---

## TECH STACK

| Layer       | Technology                       |
| ----------- | -------------------------------- |
| Frontend    | React 18 + Vite + Tailwind CSS   |
| Maps        | Leaflet.js + OpenStreetMap tiles |
| Charts      | Recharts                         |
| Backend     | Python FastAPI (uvicorn)         |
| Database    | SQLite via SQLAlchemy            |
| AI Engine   | Google Gemini 1.5 Flash API      |
| Animations  | Framer Motion                    |
| HTTP Client | Axios                            |

---

## PROJECT STRUCTURE

```text
/ubocc
  /backend
    main.py              ← FastAPI app, all routes
    models.py            ← SQLAlchemy models
    seed_data.py         ← Load all CSV data into DB
    gemini_engine.py     ← All Gemini API calls
    requirements.txt
  /frontend
    /src
      App.jsx
      /components
        CommandDashboard.jsx   ← Screen 1: Live map + KPIs
        FrequencyOptimizer.jsx ← Screen 2: AI optimization
        IncidentManager.jsx    ← Screen 3: Incidents + reroute
        PassengerAlerts.jsx    ← Screen 4: Passenger view
        Sidebar.jsx
        KPIStrip.jsx
        BusMarker.jsx
        AlertFeed.jsx
  /data
    routes_master.csv
    stops_master.csv
    depots_master.csv
    schedule_planned.csv
    bus_gps_live.csv
    incidents.csv
    events_calendar.csv
    road_segments.csv
    dispatch_actions.csv
    passenger_alerts.csv
  README.md
```

---

## STEP 1: GENERATE ALL CSV DATA FILES

Generate EXACTLY these CSV files with the data below. Do not invent data.
Use the real values provided. For GPS simulation, generate realistic
movement along the actual route corridors.

---

### FILE 1: data/routes_master.csv

```csv
route_id,route_no,route_name,origin,destination,depot_id,distance_km,total_stops,peak_headway_min,offpeak_headway_min,trip_time_min,service_type,daily_trips,daily_passengers_avg
R001,23C,Broadway - Tambaram (via Guindy Adyar),Broadway Bus Terminus,Tambaram Bus Terminus,TMB,32,42,8,15,90,Ordinary,68,12400
R002,21G,Broadway - Tambaram (via Marina),Broadway Bus Terminus,Tambaram Bus Terminus,ADR,28,38,10,18,80,Ordinary,52,9800
R003,47B,Besant Nagar - Villivakkam (via Adyar T Nagar),Besant Nagar Bus Stop,Villivakkam Bus Terminus,TNG,24,31,12,20,70,Ordinary,44,7200
R004,19B,Adyar Bus Stand - Sholinganallur,Adyar Bus Stand,Sholinganallur Bus Stop,ADR,14,18,10,15,45,Ordinary,60,8600
R005,5,Guindy - T Nagar (Panagal Park),Guindy Bus Stop,Panagal Park T Nagar,GND,9,12,8,12,30,Ordinary,80,6400
R006,29C,Central - Velachery (via Saidapet),Chennai Central Bus Stop,Velachery Bus Terminus,SPD,20,26,10,18,55,Ordinary,58,7800
R007,70,Broadway - Tambaram (via Poonamallee High Road),Broadway Bus Terminus,Tambaram Bus Terminus,TMB,35,45,12,20,95,Express,36,5200
R008,M15,Mylapore - Tambaram East (via Velachery),Mylapore Bus Stop,Tambaram East Bus Stop,TMB,22,28,15,25,65,Ordinary,40,4600
R009,27A,CMBT - Adyar (via T Nagar Saidapet),Koyambedu CMBT,Adyar Bus Stand,AND,22,28,10,15,60,Ordinary,56,8200
R010,9,Thiruvotriyur - Broadway,Thiruvotriyur Bus Terminus,Broadway Bus Terminus,PRB,28,35,15,25,75,Ordinary,36,4800
```

---

### FILE 2: data/stops_master.csv

```csv
stop_id,stop_name,stop_name_tamil,lat,lng,area,zone,interchange_type,landmark,routes_serving
S001,Broadway Bus Terminus,பிராட்வே பேருந்து நிலையம்,13.0956,80.2876,North Chennai,Zone-1,Major Terminus,Near High Court,23C;21G;70;9;29C
S002,Chennai Central Railway Station,சென்னை சென்ட்ரல் ரயில் நிலையம்,13.0827,80.2757,Central Chennai,Zone-1,Railway Interchange,Opposite Park Town,23C;29C;9
S003,Egmore Railway Station,எழும்பூர் ரயில் நிலையம்,13.0770,80.2613,Central Chennai,Zone-1,Railway Interchange,Near Hospital District,23C;29C
S004,T Nagar Panagal Park,தி.நகர் பணகல் பார்க்,13.0388,80.2323,T Nagar,Zone-2,Major Hub,Near Saravana Stores,47B;5;27A;9
S005,Guindy Bus Stop,கிண்டி பேருந்து நிறுத்தம்,13.0068,80.2206,Guindy,Zone-3,Metro Interchange,Near TIDCO Colony,23C;5;29C
S006,Saidapet Bus Stop,சைதாப்பேட்டை,13.0227,80.2202,Saidapet,Zone-3,Metro Interchange,Near Saidapet Bridge,23C;29C;5;27A
S007,Adyar Bus Stand,அடையாறு பேருந்து நிலையம்,13.0012,80.2565,Adyar,Zone-3,Major Hub,Adyar signal,19B;21G;47B;27A
S008,Thiruvanmiyur Bus Stop,திருவான்மியூர்,12.9833,80.2584,Thiruvanmiyur,Zone-4,Local Hub,Near SRP Tools,19B;M15
S009,Velachery Bus Terminus,வேளச்சேரி பேருந்து நிலையம்,12.9815,80.2209,Velachery,Zone-4,Metro Interchange,Near Phoenix Mall,29C;M15
S010,Tambaram Bus Terminus,தாம்பரம் பேருந்து நிலையம்,12.9249,80.1000,Tambaram,Zone-5,Major Terminus,Near Tambaram Junction,23C;21G;70;M15
S011,Koyambedu CMBT,கோயம்பேடு,13.0694,80.1952,Koyambedu,Zone-2,Major Terminus,Near Koyambedu Market,27A;29C
S012,Chepauk Bus Stop,சேப்பாக்கம்,13.0622,80.2793,Chepauk,Zone-1,Stadium Adjacent,Near MA Chidambaram Stadium,9;23C
S013,Besant Nagar Bus Stop,பெசண்ட் நகர்,12.9990,80.2716,Besant Nagar,Zone-3,Beach Area,Near Elliot Beach,47B
S014,Sholinganallur Bus Stop,சோழிங்கநல்லூர்,12.9010,80.2279,Sholinganallur,Zone-5,OMR Tech Corridor,Near Cognizant Campus,19B
S015,Mylapore Bus Stop,மயிலாப்பூர்,13.0330,80.2677,Mylapore,Zone-2,Cultural Hub,Near Kapaleeshwarar Temple,M15;47B
S016,Royapettah Bus Stop,ராயப்பேட்டை,13.0524,80.2614,Royapettah,Zone-2,Medical Hub,Near Apollo Hospital,21G;47B
S017,Vadapalani Bus Stop,வடபழனி,13.0503,80.2121,Vadapalani,Zone-2,Major Hub,Near Vadapalani Junction,27A;70
S018,Porur Bus Stop,பொரூர்,13.0367,80.1574,Porur,Zone-3,Western Suburb,Near Porur Lake Junction,70
S019,Velachery Bypass,வேளச்சேரி பைபாஸ்,12.9745,80.2150,Velachery,Zone-4,OMR connector,Near Vijay TV,29C
S020,Perambur Bus Stop,பெரம்பூர்,13.1171,80.2494,Perambur,Zone-1,North Chennai,Near Perambur Railway Station,9
S021,Villivakkam Bus Terminus,வில்லிவாக்கம்,13.1135,80.2117,Villivakkam,Zone-2,North West Hub,Near Villivakkam Junction,47B
S022,Nungambakkam Bus Stop,நுங்கம்பாக்கம்,13.0600,80.2412,Nungambakkam,Zone-2,Upscale Hub,Near Indian Bank HQ,47B;27A
S023,Anna Nagar Roundtana,அண்ணா நகர் வட்டம்,13.0849,80.2101,Anna Nagar,Zone-2,Residential Hub,Near Anna Nagar Tower,27A
S024,Thiruvotriyur Bus Terminus,திருவொற்றியூர்,13.1666,80.3107,Thiruvotriyur,Zone-1,Port Area,Near TNPCB,9
S025,Chromepet Bus Stop,குரோம்பேட்டை,12.9516,80.1417,Chromepet,Zone-5,South Suburb,Near Chromepet Signal,23C;70
S026,Pallavaram Bus Stop,பல்லாவரம்,12.9673,80.1574,Pallavaram,Zone-5,South Suburb,Near IAF Station,23C;70
S027,Nanganallur Bus Stop,நாங்கநல்லூர்,12.9893,80.1965,Nanganallur,Zone-4,South Hub,Near Metro Station,29C
S028,Perungudi Bus Stop,பெருங்குடி,12.9587,80.2415,Perungudi,Zone-4,IT Corridor,Near Tidel Park,19B
S029,Medavakkam Bus Stop,மேடவாக்கம்,12.9211,80.1963,Medavakkam,Zone-5,South East Suburb,Near Medavakkam Junction,M15
S030,OMR Sholinganallur Signal,ஓ.எம்.ஆர் சோழிங்கநல்லூர்,12.9007,80.2267,Sholinganallur,Zone-5,IT Hub,Near Infosys Campus,19B
```

---

### FILE 3: data/depots_master.csv

```csv
depot_id,depot_code,depot_name,depot_name_tamil,lat,lng,address,fleet_size,spare_buses,routes_managed,zone_coverage,contact_code
TMB,TMB,Tambaram Bus Depot,தாம்பரம் பேருந்து நிலையம்,12.9243,80.1020,Tambaram Bus Depot Road Tambaram Chennai 600045,280,42,23C;21G;70;M15,Southern Corridor,044-22260001
ADR,ADR,Adyar Bus Depot,அடையாறு பேருந்து நிலையம்,13.0044,80.2599,1st Main Road Adyar Chennai 600020,240,36,19B;21G;47B;27A,Adyar-Besant Nagar-OMR,044-24413002
TNG,TNG,T Nagar Bus Depot,தி.நகர் பேருந்து நிலையம்,13.0372,80.2251,Usman Road T Nagar Chennai 600017,220,33,47B;5;M15,T Nagar-Nungambakkam-Mylapore,044-24340003
GND,GND,Guindy Bus Depot,கிண்டி பேருந்து நிலையம்,13.0054,80.2167,GST Road Guindy Chennai 600032,200,30,5;23C;29C,Guindy-Saidapet-Airport,044-22500004
SPD,SPD,Saidapet Bus Depot,சைதாப்பேட்டை பேருந்து நிலையம்,13.0232,80.2177,Saidapet Bus Depot Saidapet Chennai 600015,180,27,29C;5;27A,Saidapet-Velachery-Nanganallur,044-24353005
AND,AND,Anna Nagar Bus Depot,அண்ணா நகர் பேருந்து நிலையம்,13.0877,80.2100,Anna Nagar West Chennai 600040,200,30,27A;29C,Anna Nagar-Mogappair-Koyambedu,044-26151006
PRB,PRB,Perambur Bus Depot,பெரம்பூர் பேருந்து நிலையம்,13.1179,80.2452,Perambur High Road Chennai 600011,160,24,9,North Chennai-Tondiarpet,044-25313007
```

---

### FILE 4: data/schedule_planned.csv

```csv
schedule_id,route_id,trip_id,direction,scheduled_departure,scheduled_arrival,assigned_depot,bus_type,peak_period,planned_headway_min,stops_count
SCH001,R001,T001,outbound,06:00,07:30,TMB,Semi-Low Floor,morning_peak,8,42
SCH002,R001,T002,outbound,06:08,07:38,TMB,Semi-Low Floor,morning_peak,8,42
SCH003,R001,T003,outbound,06:16,07:46,TMB,Semi-Low Floor,morning_peak,8,42
SCH004,R002,T004,outbound,06:15,07:35,ADR,Ordinary,morning_peak,10,38
SCH005,R003,T005,outbound,06:20,07:30,TNG,Ordinary,morning_peak,12,31
SCH006,R004,T006,outbound,06:10,06:55,ADR,Semi-Low Floor,morning_peak,10,18
SCH007,R005,T007,outbound,06:05,06:35,GND,Ordinary,morning_peak,8,12
SCH008,R006,T008,outbound,06:12,07:07,SPD,Ordinary,morning_peak,10,26
SCH009,R001,T009,inbound,07:00,08:30,TMB,Semi-Low Floor,morning_peak,8,42
SCH010,R004,T010,inbound,07:15,08:00,ADR,Semi-Low Floor,morning_peak,10,18
SCH011,R001,T011,outbound,09:30,11:00,TMB,Semi-Low Floor,offpeak,15,42
SCH012,R001,T012,outbound,12:00,13:30,TMB,Ordinary,offpeak,15,42
SCH013,R001,T013,outbound,17:00,18:30,TMB,Semi-Low Floor,evening_peak,8,42
SCH014,R002,T014,outbound,17:15,18:35,ADR,Ordinary,evening_peak,10,38
SCH015,R004,T015,outbound,17:10,17:55,ADR,Semi-Low Floor,evening_peak,8,18
```

---

### FILE 5: data/events_calendar.csv

Use REAL IPL 2025 Chepauk schedule:

```csv
event_id,event_name,venue,venue_lat,venue_lng,event_type,expected_attendance,start_datetime,end_datetime,impact_radius_km,affected_routes,affected_road_corridors,surge_factor,notes
EV001,CSK vs MI IPL 2025,MA Chidambaram Stadium Chepauk,13.0622,80.2793,IPL Cricket Match,37505,2025-03-23 19:30,2025-03-23 23:00,3.0,23C;21G;9;29C,Wallajah Road;Anna Salai;Kamarajar Salai;Triplicane High Road,3.2,Free MTC travel for ticket holders
EV002,CSK vs RCB IPL 2025,MA Chidambaram Stadium Chepauk,13.0622,80.2793,IPL Cricket Match,37505,2025-03-28 19:30,2025-03-28 23:00,3.0,23C;21G;9;29C,Wallajah Road;Anna Salai;Kamarajar Salai,3.4,Evening match - rain risk
EV003,CSK vs DC IPL 2025,MA Chidambaram Stadium Chepauk,13.0622,80.2793,IPL Cricket Match,37505,2025-04-05 15:30,2025-04-05 19:00,3.0,23C;21G;9;29C,Wallajah Road;Anna Salai,2.8,Afternoon match
EV004,CSK vs KKR IPL 2025,MA Chidambaram Stadium Chepauk,13.0622,80.2793,IPL Cricket Match,37505,2025-04-11 19:30,2025-04-11 23:00,3.0,23C;21G;9;29C,Wallajah Road;Anna Salai;Triplicane High Road,3.3,Night match - high surge
EV005,CSK vs SRH IPL 2025,MA Chidambaram Stadium Chepauk,13.0622,80.2793,IPL Cricket Match,37505,2025-04-25 19:30,2025-04-25 23:00,3.0,23C;21G;9;29C,Wallajah Road;Anna Salai,3.1,Pre-monsoon period
EV006,CSK vs PBKS IPL 2025,MA Chidambaram Stadium Chepauk,13.0622,80.2793,IPL Cricket Match,37505,2025-04-30 19:30,2025-04-30 23:00,3.0,23C;21G;9;29C,Wallajah Road;Anna Salai,3.0,Last April home game
EV007,CSK vs RR IPL 2025,MA Chidambaram Stadium Chepauk,13.0622,80.2793,IPL Cricket Match,37505,2025-05-12 19:30,2025-05-12 23:00,3.0,23C;21G;9;29C,Wallajah Road;Anna Salai,3.2,Last home league game
EV008,Aadi Perukku,Marina Beach,13.0523,80.2818,Religious Festival,150000,2025-08-01 06:00,2025-08-01 21:00,5.0,23C;21G;9,Kamarajar Salai;Marina Beach Road,4.5,Massive crowd - annual event
EV009,Pongal Celebrations,Multiple Zones Chennai,13.0827,80.2707,Cultural Festival,500000,2026-01-14 06:00,2026-01-16 22:00,10.0,23C;21G;9;47B;5,All major corridors,5.0,Highest annual surge event
```

---

### FILE 6: data/incidents.csv

```csv
incident_id,type,location_name,lat,lng,severity,affected_routes,diversion_suggestion,start_time,estimated_duration_min,status,reporter
INC001,Road Closure,Anna Salai near LIC Building,13.0641,80.2501,High,23C;29C,Via Nungambakkam High Road then Kodambakkam High Road,2025-04-25 18:45,120,active,Traffic Police
INC002,Waterlogging,Velachery Bypass near Phoenix Mall,12.9745,80.2150,Medium,29C;M15,Via Pallikaranai Road alternate,2025-04-25 17:30,90,active,GCC Alert
INC003,Heavy Traffic,Guindy Signal near TIDCO,13.0068,80.2206,Medium,23C;5;29C,No diversion - extend headway,2025-04-25 18:00,60,monitoring,System Detected
INC004,Bus Bunching,Route 23C near T Nagar Panagal Park,13.0388,80.2323,Low,23C,Hold bus 3 at Saidapet for 8 min,2025-04-25 18:10,30,active,System AI
INC005,Crowd Surge,Chepauk Stadium Gate Area,13.0622,80.2793,High,23C;21G;9,Deploy extra buses from Adyar Depot on 21G,2025-04-25 22:00,90,predicted,Event Calendar
INC006,Metro Work,Koyambedu Junction CMRL Phase 2,13.0694,80.1952,Medium,27A;29C,Via Collector Nagar then Thirumangalam Road,2025-04-01 07:00,21600,active,CMRL Notice
```

---

### FILE 7: data/road_segments.csv

```csv
segment_id,segment_name,from_location,to_location,from_lat,from_lng,to_lat,to_lng,road_type,normal_speed_kmph,current_speed_kmph,congestion_level,incident_flag,affected_routes
SEG001,Anna Salai Central,Gemini Flyover,LIC Building,13.0641,80.2501,13.0452,80.2483,Arterial,35,12,High,Yes,23C;29C
SEG002,GST Road Guindy,TIDCO Junction,Pallavaram Junction,13.0068,80.2206,12.9673,80.1574,National Highway,50,22,High,No,23C;70
SEG003,Kamarajar Salai,Triplicane,Marina Beach Road,13.0523,80.2818,13.0622,80.2793,Coastal Road,40,8,Very High,Yes,23C;21G;9
SEG004,Wallajah Road,Chepauk Signal,Park Town,13.0622,80.2793,13.0827,80.2757,City Road,30,6,Very High,Yes,9;23C
SEG005,OMR Phase 1,Perungudi,Sholinganallur,12.9587,80.2415,12.9007,80.2267,IT Corridor Road,60,45,Low,No,19B
SEG006,Velachery Main Road,Velachery Bypass,Velachery Bus Terminus,12.9745,80.2150,12.9815,80.2209,City Road,30,5,Very High,Yes,29C;M15
SEG007,T Nagar Usman Road,Panagal Park,T Nagar Bus Depot,13.0388,80.2323,13.0372,80.2251,Commercial Zone,25,10,High,No,47B;5
SEG008,Poonamallee High Road,CMBT,Porur,13.0694,80.1952,13.0367,80.1574,Arterial,45,28,Medium,No,70
```

---

### FILE 8: data/bus_gps_live.csv

Generate 30 buses × 60 timesteps (30 seconds apart) = 1800 rows.
Buses move along their route corridors using the stop coordinates above.

Key buses to simulate (hardcode these):

```csv
bus_id,route_id,trip_id,lat,lng,speed_kmph,occupancy_pct,delay_min,status,heading,timestamp,next_stop_id,next_stop_eta_min
MTC-2301,R001,T013,13.0956,80.2876,0,45,0,at_stop,South,2025-04-25 17:00:00,S002,8
MTC-2302,R001,T013,13.0650,80.2630,18,72,3,in_transit,South,2025-04-25 17:00:00,S005,22
MTC-2303,R001,T013,13.0068,80.2206,8,95,12,delayed,South,2025-04-25 17:00:00,S005,18
MTC-2101,R002,T014,13.0956,80.2876,0,38,0,at_stop,South,2025-04-25 17:00:00,S002,10
MTC-2102,R002,T014,13.0523,80.2818,5,88,8,delayed,South,2025-04-25 17:00:00,S012,6
MTC-4701,R003,T005,12.9990,80.2716,22,55,0,in_transit,North,2025-04-25 17:00:00,S015,12
MTC-1901,R004,T015,13.0044,80.2599,35,62,0,in_transit,South,2025-04-25 17:00:00,S008,8
MTC-1902,R004,T015,12.9587,80.2415,42,45,0,in_transit,South,2025-04-25 17:00:00,S030,5
MTC-0501,R005,T007,13.0068,80.2206,12,78,5,delayed,East,2025-04-25 17:00:00,S004,10
MTC-2901,R006,T008,13.0827,80.2757,0,55,2,at_stop,South,2025-04-25 17:00:00,S006,15
MTC-2902,R006,T008,12.9745,80.2150,0,110,25,overloaded,South,2025-04-25 17:00:00,S009,0
MTC-7001,R007,T012,13.0694,80.1952,30,42,0,in_transit,South,2025-04-25 17:00:00,S018,10
MTC-M151,R008,T006,13.0330,80.2677,15,65,3,in_transit,South,2025-04-25 17:00:00,S009,18
MTC-2701,R009,T010,13.0694,80.1952,25,71,0,in_transit,East,2025-04-25 17:00:00,S004,12
MTC-0901,R010,T009,13.1666,80.3107,0,35,0,at_stop,South,2025-04-25 17:00:00,S020,20
```

After this seed, animate each bus moving toward its next stop using
linear interpolation of lat/lng between consecutive stops on the route.
Update every 30 seconds. Use `setInterval` in frontend.

---

### FILE 9: data/dispatch_actions.csv

```csv
action_id,timestamp,trigger_type,trigger_description,route_id,recommendation,officer_id,officer_name,status,depot_assigned,buses_requested,buses_dispatched,estimated_impact_min,actual_impact_min
DA001,2025-04-25 17:45,AI_Prediction,Bus bunching detected on 23C near Guindy,R001,Hold MTC-2303 at Saidapet for 8 minutes to restore 10-min headway,OFF001,Karthik Kumar,approved,GND,0,0,8,7
DA002,2025-04-25 18:15,Event_Alert,IPL match crowd surge predicted at Chepauk,R002,Deploy 3 additional buses on 21G from Adyar Depot,OFF001,Karthik Kumar,approved,ADR,3,3,0,0
DA003,2025-04-25 18:30,Incident_Report,Waterlogging on Velachery Bypass,R006,Divert Route 29C via Pallikaranai Road alternate,OFF002,Priya Nair,pending,SPD,0,0,15,0
DA004,2025-04-25 19:00,AI_Prediction,Post-match surge prediction 37505 crowd dispersal,R001,Add 5 buses on 23C from Broadway depot,OFF001,Karthik Kumar,pending,TMB,5,0,0,0
```

---

### FILE 10: data/passenger_alerts.csv

```csv
alert_id,route_id,stop_id,alert_type,message_english,message_tamil,severity,issued_time,valid_until,channel
PA001,R006,S009,Diversion,Route 29C diverted via Pallikaranai Rd due to waterlogging at Velachery. Extra travel time: 15 min.,வழி 29C வேளச்சேரியில் வெள்ளக்கேடு காரணமாக பள்ளிக்கரணை வழியாக திருப்பப்பட்டுள்ளது. கூடுதல் நேரம்: 15 நிமிடம்.,High,2025-04-25 18:30,2025-04-25 21:00,display_app_sms
PA002,R001,S012,Crowd Alert,Heavy crowd near Chepauk after IPL match. Bus 23C may be delayed 10-15 min. Consider Route 21G via Marina.,சேப்பாக்கம் அருகில் IPL ஆட்டத்திற்குப் பிறகு அதிக கூட்டம். பேருந்து 23C 10-15 நிமிடம் தாமதமாகலாம். மரீனா வழியாக 21G பயன்படுத்தலாம்.,High,2025-04-25 22:00,2025-04-25 23:30,display_app_sms
PA003,R002,S007,Extra Buses,3 extra buses deployed on Route 21G from Adyar to Broadway to handle IPL match crowd.,ஆட்டக் கூட்டத்தை சமாளிக்க 21G வழியில் அடையாறிலிருந்து பிராட்வேக்கு 3 கூடுதல் பேருந்துகள் நியமிக்கப்பட்டுள்ளன.,Medium,2025-04-25 22:15,2025-04-25 23:30,display_app
PA004,R001,S005,Delay,Route 23C delayed 12 min at Guindy due to heavy traffic on GST Road.,ஜி.எஸ்.டி ரோட்டில் அதிக போக்குவரத்து காரணமாக 23C கிண்டியில் 12 நிமிடம் தாமதம்.,Medium,2025-04-25 17:45,2025-04-25 19:00,display
```

---

## STEP 2: BACKEND — FastAPI (backend/main.py)

Build a FastAPI backend with these endpoints:

```text
GET  /api/buses/live          → All bus GPS positions (live feed)
GET  /api/routes              → All routes with stops
GET  /api/stops               → All stops
GET  /api/depots              → All depots
GET  /api/incidents           → Active incidents
GET  /api/events              → Today's/upcoming events
GET  /api/kpis                → Live dashboard KPIs
GET  /api/alerts              → Passenger alerts
GET  /api/dispatch            → Dispatch action log
POST /api/dispatch/approve    → Officer approves action
POST /api/dispatch/reject     → Officer rejects action
POST /api/ai/optimize         → Trigger Gemini frequency optimizer
POST /api/ai/reroute          → Trigger Gemini reroute recommendation
POST /api/scenario/ipl_rain   → Trigger the Chepauk IPL+Rain demo scenario
GET  /api/road_segments       → Traffic segment data
```

The `/api/buses/live` endpoint should return slightly different positions
each call (simulate movement) using the route corridor waypoints.

---

## STEP 3: GEMINI AI ENGINE (backend/gemini_engine.py)

### Function 1: optimize_frequency()

```python
SYSTEM_PROMPT = """
You are an MTC Chennai bus operations AI with 20 years of experience.
You understand Chennai's traffic patterns, monsoon conditions, IPL crowd 
behavior, and depot constraints.

When asked to optimize bus frequency, respond ONLY with valid JSON.
No preamble, no explanation outside the JSON.
"""

USER_PROMPT_TEMPLATE = """
Route: {route_no} ({origin} → {destination})
Current headway: {current_headway} minutes
Current occupancy on overloaded buses: {max_occupancy}%
Passenger demand score: {demand_score}/10
Active condition: {condition}
Time of day: {time_of_day}
Available spare buses at {depot}: {spare_buses}
Affected road corridors congestion: {congestion}

Recommend optimal frequency adjustment.

Respond ONLY with this JSON structure:
{{
  "recommended_headway_min": <integer>,
  "extra_buses_needed": <integer>,
  "hold_buses": [<list of bus_ids to hold at intermediate stops>],
  "reasoning": "<2 sentence explanation in plain language>",
  "confidence_score": <0.0 to 1.0>,
  "urgency": "<low|medium|high|critical>",
  "passenger_impact": "<one line: what passengers will experience>",
  "depot_instruction": "<one line instruction for depot manager>"
}}
"""
```

### Function 2: generate_reroute()

```python
REROUTE_PROMPT = """
Incident: {incident_type} at {location}
Severity: {severity}
Affected routes: {routes}
Normal path: {normal_path}
Suggested alternate: {alternate}
Current traffic on alternate: {alt_traffic}

Generate a reroute recommendation. Respond ONLY with JSON:
{{
  "diversion_route": "<road names for alternate path>",
  "estimated_extra_time_min": <integer>,
  "stops_to_skip": [<list of stop names>],
  "new_stops_to_add": [<list of stop names if any>],
  "driver_instruction": "<max 20 words, clear instruction for driver>",
  "alert_english": "<passenger alert in English, max 25 words>",
  "alert_tamil": "<passenger alert in Tamil, max 25 words>",
  "confidence": <0.0 to 1.0>
}}
"""
```

### Function 3: generate_event_plan()

For IPL match days, auto-generate a pre-event deployment plan.

---

## STEP 4: FRONTEND SCREENS

### Design Language

- **Theme**: Industrial command center — dark slate backgrounds, amber
  warning accents, green status indicators, red alerts
- **Background**: `#0B1120` (deep navy)
- **Primary accent**: `#F59E0B` (amber — MTC yellow)
- **Alert red**: `#EF4444`
- **Safe green**: `#22C55E`
- **Text**: `#E2E8F0`
- **Card bg**: `#1E293B`
- **Border**: `#334155`
- **Font**: Use `'JetBrains Mono'` for data values, `'Inter'` for labels
  (import from Google Fonts)

---

### SCREEN 1: COMMAND DASHBOARD (CommandDashboard.jsx)

**Left sidebar (280px)**:

- U-BOCC logo with MTC Tamil Nadu government colors
- Navigation: Dashboard | Optimizer | Incidents | Passengers
- Active Alerts feed: scrolling list of INC001-INC006

**Main content area — split into map (60%) and right panel (40%)**:

**Map panel (Leaflet)**:

- Center: Chennai `[13.0827, 80.2707]`, zoom 12
- Tile: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
- Show all 30 stops as circle markers (blue)
- Show 7 depots as warehouse icons (orange)
- Show 15 buses as animated bus markers:
  - Green bus = normal
  - Orange bus = delayed (delay > 5 min)
  - Red bus = overloaded (occupancy > 100%) or critical
  - Pulsing red circle = incident location
- Draw route polylines for all 10 routes (different colors)
- Highlight Chepauk Stadium with a yellow stadium marker
- Animate buses moving along routes every 3 seconds

**Right panel**:

- **KPI Strip** (4 cards stacked):
  - Avg Wait Time: `22 min → 16 min` (with trend arrow)
  - Bunching Incidents Today: `3 active`
  - Overloaded Buses: `2` (red badge)
  - Alerts Sent: `4 today`
- **AI Recommendation Card** (amber border):
  - Latest AI recommendation from Gemini
  - "APPROVE" / "MODIFY" / "REJECT" buttons
  - Shows confidence score as progress bar
- **Live Event Banner** (if event active):
  - Shows: "IPL TONIGHT — CSK vs MI | MA Chidambaram Stadium | 7:30 PM |
    Expected crowd: 37,505 | Routes 23C, 21G, 9 IMPACTED"

---

### SCREEN 2: AI FREQUENCY OPTIMIZER (FrequencyOptimizer.jsx)

**Input panel (left 40%)**:

```text
Route Selector: [Dropdown — all 10 routes]
Current Headway: [Number input, default from route data]
Demand Level: [Slider 1-10]
Active Condition: [Dropdown]
  → Normal Operations
  → IPL Match Day (Chepauk — 37,505 crowd)
  → Heavy Rain (Northeast Monsoon)
  → Road Closure (Anna Salai)
  → Metro Work (Koyambedu)
  → Peak Hour + Rain Combined
Time of Day: [Dropdown] Morning Peak | Evening Peak | Off-Peak | Night
Spare Buses at Depot: [Auto-filled from depots_master.csv]
[RUN AI OPTIMIZATION] button (amber, pulsing)
```

**Output panel (right 60%)**:

- Loading state: "Consulting MTC operations AI..."
- Results card with:
  - Recommended headway (large number)
  - Extra buses needed (with depot source)
  - Reasoning text (from Gemini)
  - Urgency badge (color coded)
  - Passenger impact statement
  - Depot instruction
  - Confidence score bar
  
**Approval Workflow**:

```text
┌─────────────────────────────────────────────┐
│  OFFICER APPROVAL REQUIRED                   │
│  Officer: Karthik Kumar, Zone Control        │
│  [✓ APPROVE & DISPATCH]  [✗ REJECT]         │
│  [✎ MODIFY RECOMMENDATION]                   │
└─────────────────────────────────────────────┘
```

On APPROVE:

1. Add entry to dispatch_actions.csv
2. Show "Depot notified: [DEPOT_NAME] — Deploy [N] buses on Route [X]"
3. Show driver alert simulation (SMS card)
4. Flash green success banner

**Optimization History Table** (below):
Show all past dispatch actions from dispatch_actions.csv with status badges.

---

### SCREEN 3: INCIDENT & REROUTE MANAGER (IncidentManager.jsx)

**Incident Cards** (from incidents.csv):
Each card shows:

- Incident type icon (🌧️ Rain | 🚧 Road Closure | 🏏 IPL Crowd |
  🚌 Bus Bunching | 🚇 Metro Work)
- Location name
- Affected routes (badges)
- Severity (color coded)
- Status (Active / Monitoring / Resolved)
- AI Reroute Recommendation button
- Timeline of actions taken

**[SIMULATE IPL + RAIN SCENARIO] — Big amber button**

When clicked, play this 10-step animated story (2.5 sec each step):

```text
Step 1: 🏏 EVENT DETECTED
  → "CSK vs MI IPL match at MA Chidambaram Stadium"
  → "Expected attendance: 37,505"
  → "Match starts: 19:30 | Est. dispersal: 22:00–22:45"

Step 2: 🌧️ WEATHER ALERT  
  → "IMD Warning: Heavy rain in Chennai Central, T Nagar, Chepauk zones"
  → "Rainfall: 35mm expected between 20:00–23:00"
  → "Waterlogging risk: Velachery Bypass — HIGH"

Step 3: 🤖 AI PREDICTION
  → "Route 23C: 340% demand surge predicted at Chepauk stop 22:00–22:45"
  → "Route 21G: 290% surge predicted at Marina approach"
  → "Route 29C: Velachery section BLOCKED — waterlogging risk"
  → "Route 9: Wallajah Road speed 6 km/h — critical congestion"

Step 4: ⚠️ PRIORITY SCORING
  → "Critical: Chepauk crowd dispersal — 37,505 passengers"
  → "High: Velachery waterlogging — 3 routes affected"
  → "Medium: Anna Salai congestion — evening peak overlap"

Step 5: 🤖 GEMINI RECOMMENDATION GENERATED
  → Card appears with full JSON recommendation:
  → "Deploy 4 extra buses on 21G (Adyar Depot)"
  → "Hold MTC-2303 at Saidapet 10 min to clear Guindy congestion"
  → "Divert 29C via Pallikaranai Road — bypass Velachery"
  → "Confidence: 0.91 | Urgency: CRITICAL"

Step 6: 👮 OFFICER APPROVAL
  → "Officer Karthik Kumar, Zone Control — reviewing..."
  → [APPROVE] button flashes → clicked
  → "✓ APPROVED at 19:42:33 | Officer ID: OFF001"

Step 7: 🏭 DEPOT DISPATCH
  → "Adyar Depot (ADR): DISPATCH 4 buses on Route 21G immediately"
  → "T Nagar Depot (TNG): HOLD 2 spare buses on standby"
  → "Saidapet Depot (SPD): Reroute 29C drivers — new path briefed"
  → Depot card shows: "MTC-2101, MTC-2103, MTC-2104, MTC-2105 deploying"

Step 8: 📱 DRIVER ALERTS
  → SMS-style cards pop up:
  → MTC-2303: "Hold at Saidapet Bus Stop for 10 min. Resume 17:52. 
     Reason: Spacing adjustment. Ack?"  → [✓ Acknowledged 17:43]
  → MTC-2901 (29C): "ROUTE CHANGE: Skip Velachery Bypass. 
     Use Pallikaranai Road. Follow updated signboard. Ack?" 
     → [✓ Acknowledged 17:44]

Step 9: 📣 PASSENGER ALERTS FIRE
  → Show 3 alert cards Tamil + English:
  → Broadway stop: "3 extra 21G buses en route — wait max 8 min"
  → Chepauk stop: "Heavy crowd post-match. 23C delayed. Use 21G. 
     Next bus: 7 min"
  → Velachery stop: "29C DIVERTED. Via Pallikaranai Road. 
     Extra time: 12 min"

Step 10: 📊 DASHBOARD UPDATE
  → KPI strip updates live:
  → Wait time: 22 min → 16 min ✅
  → Bunching: 3 → 1 ✅  
  → Alerts sent: 4 → 7 ✅
  → "Scenario complete — U-BOCC response time: 11 minutes"
```

---

### SCREEN 4: PASSENGER ALERT CENTER (PassengerAlerts.jsx)

Show a simulated "passenger-facing" view with:

#### Top: Route selector + stop selector

#### Alert board (mimics digital display board at bus stop)

```text
┌────────────────────────────────────────────────┐
│  BROADWAY BUS TERMINUS  |  பிராட்வே பேருந்து   │
│  Last updated: 17:43                           │
├──────┬───────────────┬───────┬─────────────────┤
│ Route│ Destination   │ ETA   │ Status          │
├──────┼───────────────┼───────┼─────────────────┤
│ 23C  │ Tambaram      │ 8 min │ 🟡 Moderate Load│
│ 21G  │ Tambaram      │ 12 min│ 🟢 Seats Avail  │
│ 9    │ Thiruvotriyur │ 5 min │ 🔴 Crowded      │
│ 70   │ Tambaram      │ 18 min│ 🟢 Seats Avail  │
└──────┴───────────────┴───────┴─────────────────┘
```

**Active Alerts section** (cards with Tamil + English):

- Each alert card has bilingual text
- Color coded by severity
- Source attribution (MTC U-BOCC / IMD / Traffic Police)

**Before vs After Panel**:

```text
┌─────────────────────────────────────────────────────────┐
│         U-BOCC IMPACT — IPL MATCH DAY COMPARISON        │
├──────────────────────┬──────────────────┬───────────────┤
│ Metric               │ Before U-BOCC    │ After U-BOCC  │
├──────────────────────┼──────────────────┼───────────────┤
│ Avg wait time        │ 22 min           │ 16 min ↓27%   │
│ Buses bunching       │ 4 incidents      │ 1 incident    │
│ Incident response    │ 28 min           │ 8 min  ↓71%   │
│ Passenger info       │ None             │ Real-time     │
│ Depot coordination   │ Phone calls      │ Instant       │
│ Driver alerts        │ Radio/Manual     │ Digital SMS   │
│ Overloaded buses     │ 6 flagged late   │ Detected early│
└──────────────────────┴──────────────────┴───────────────┘
```

---

## STEP 5: ENVIRONMENT & CONFIGURATION

**backend/.env**:

```env
GEMINI_API_KEY=your_key_here
DATABASE_URL=sqlite:///./ubocc.db
CORS_ORIGINS=http://localhost:8080
```

**frontend/.env**:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_GEMINI_KEY=your_key_here
```

---

## STEP 6: README.md

Write a clear README with:

```markdown
# Chennai U-BOCC
## AI-Powered Bus Frequency Optimization & Smart Transport Command System

### Quick Start (3 commands)

# Terminal 1 — Backend
cd backend
pip install -r requirements.txt
python seed_data.py       # loads all CSV data into SQLite
uvicorn main:app --reload

# Terminal 2 — Frontend  
cd frontend
npm install
npm run dev
# Open http://localhost:5173

### Gemini API Key
Get free key at https://aistudio.google.com/
Add to backend/.env as GEMINI_API_KEY=

### Demo Scenario
1. Open Dashboard — watch 15 live buses on Chennai map
2. Go to Optimizer → select Route 23C → set condition "IPL Match Day"
3. Click "Run AI Optimization" — see Gemini recommendation
4. Click Approve — watch depot dispatch and driver alerts fire
5. Go to Incidents → click "Simulate IPL + Rain Scenario"
   Watch the 10-step command center response unfold live
6. Go to Passengers → see bilingual alerts and before/after impact
```

---

## CRITICAL REALISM REQUIREMENTS

1. **Never use placeholder coordinates** — all lat/lng values in this
   prompt are real Chennai locations. Use them exactly.

2. **Route 23C facts**: It is Chennai's busiest route (Broadway-Tambaram
   via Guindy). 68 daily trips. ~12,400 passengers/day. Managed by
   Tambaram Depot. Takes 90 min end-to-end.

3. **Chepauk Stadium**: Capacity 37,505. Located at 13.0622°N, 80.2793°E
   on Wallajah Road. MRTS station adjacent. CSK offers free MTC travel
   on match days. Routes 23C, 21G, 9 most impacted.

4. **MTC fleet**: 3,376 buses total, 3,233 scheduled daily.
   5.09 million passengers/day average. 668 routes. 4,490 stops.

5. **Depot realism**: Show actual depot codes (TMB, ADR, TNG, GND, SPD,
   AND, PRB) on all depot communications.

6. **Tamil language**: All passenger alerts must have Tamil translation.
   Tamil is the official language of Tamil Nadu.

7. **Weather**: Chennai has northeast monsoon (Oct–Dec) and southwest
   monsoon (Jun–Sep). Waterlogging commonly occurs at Velachery Bypass,
   Saidapet underpass, and Guindy.

8. **Officer workflow**: In real MTC, depot-level decisions go through
   Zone Control Officers. Show this hierarchy in approval UI.

---

## BUILD ORDER

Build in this exact order to avoid dependency issues:

1. Generate all 10 CSV files in /data/
2. Build backend/models.py and backend/seed_data.py
3. Build backend/main.py with all API endpoints
4. Build backend/gemini_engine.py
5. Test backend: `uvicorn main:app --reload`
6. Build frontend/src/App.jsx with router and sidebar
7. Build CommandDashboard.jsx (map first, then KPIs)
8. Build FrequencyOptimizer.jsx
9. Build IncidentManager.jsx (with scenario animation)
10. Build PassengerAlerts.jsx
11. Connect all frontend API calls to backend
12. Test full end-to-end demo flow
13. Write README.md

---

## WHAT JUDGES WILL SEE IN 60 SECONDS

Make sure these 6 things are visible immediately on load:

1. Real Chennai city map with animated buses on actual route corridors
2. "IPL TONIGHT" event banner with real match data
3. 2 active incidents (red indicators on map)
4. KPI strip showing live metrics
5. One AI recommendation card already visible
6. Tamil + English bilingual elements visible somewhere

This is the difference between winning and losing. Build for the judge's
first 60 seconds.

---

Data sources: MTC Official (mtcbus.tn.gov.in), Wikipedia MTC Chennai,
IPL 2025 CSK schedule (chennaisuperkings.com), OpenStreetMap Chennai,
IMD Chennai forecast patterns, Chennai Traffic Police advisories
