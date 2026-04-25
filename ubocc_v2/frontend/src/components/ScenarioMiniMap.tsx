"use client"

import React, { useEffect, useRef } from 'react';
import DeckGL from '@deck.gl/react';
import { PathLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import { Map } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

// ── Real road-following route coordinates ────────────────────────────────────
const ROUTE_PATHS: Record<string, [number,number][]> = {
  '23C': [[80.2876,13.0956],[80.2757,13.0827],[80.2613,13.0770],[80.2501,13.0641],[80.2614,13.0524],[80.2323,13.0388],[80.2202,13.0227],[80.2206,13.0068],[80.1574,12.9673],[80.1417,12.9516],[80.1000,12.9249]],
  '21G': [[80.2876,13.0956],[80.2757,13.0827],[80.2793,13.0622],[80.2818,13.0523],[80.2677,13.0330],[80.2599,13.0044],[80.2584,12.9833],[80.1574,12.9673],[80.1000,12.9249]],
  '29C_n': [[80.2757,13.0827],[80.2323,13.0388],[80.2202,13.0227],[80.1965,12.9893],[80.2150,12.9745],[80.2209,12.9815]],
  '29C_d': [[80.2757,13.0827],[80.2323,13.0388],[80.2202,13.0227],[80.1965,12.9893],[80.1963,12.9211],[80.2415,12.9587],[80.2209,12.9815]],
  '9': [[80.2876,13.0956],[80.2793,13.0622],[80.2494,13.1171],[80.3107,13.1666]],
};

const CHEPAUK:[number,number] = [80.2793, 13.0622];
const ADR:[number,number] = [80.2599, 13.0044];
const TNG:[number,number] = [80.2251, 13.0372];
const SPD:[number,number] = [80.2177, 13.0232];

const DEPOTS = [
  { id:'ADR', pos: ADR, name:'Adyar Depot' },
  { id:'TNG', pos: TNG, name:'T Nagar Depot' },
  { id:'SPD', pos: SPD, name:'Saidapet Depot' },
];

function getAutoZoom(step: number): { lng:number; lat:number; zoom:number } {
  if (step === 1) return { lng:CHEPAUK[0], lat:CHEPAUK[1], zoom:14 };
  if (step === 3) return { lng:80.2400, lat:13.0200, zoom:11 };
  if (step === 6) return { lng:80.2200, lat:12.9900, zoom:12 };
  if (step === 10) return { lng:80.2400, lat:13.0300, zoom:11 };
  return { lng:80.2300, lat:13.0200, zoom:11 };
}

export default function ScenarioMiniMap({ currentStep }: { currentStep: number }) {
  const step = currentStep || 0;
  const prevStep = useRef(0);
  const [vs, setVs] = React.useState({ longitude:80.23, latitude:13.04, zoom:11, pitch:0, bearing:0 });

  useEffect(() => {
    if (step !== prevStep.current) {
      prevStep.current = step;
      const z = getAutoZoom(step);
      setVs(v => ({ ...v, longitude: z.lng, latitude: z.lat, zoom: z.zoom, transitionDuration: 1200 }));
    }
  }, [step]);

  // Build Deck.gl layers based on step
  const layers: any[] = [];

  // Base dim routes (always visible)
  const baseRoutes = [
    { path: ROUTE_PATHS['23C'], id:'23C' },
    { path: ROUTE_PATHS['21G'], id:'21G' },
    { path: ROUTE_PATHS['29C_n'], id:'29C_n' },
  ];
  layers.push(new PathLayer({ id:'base-routes', data: baseRoutes, widthMinPixels:2, getPath:(d:any)=>d.path, getColor:[71,85,105,100] as any, getWidth:2 }));

  // Step 1+: Chepauk pulsing
  if (step >= 1) {
    layers.push(new ScatterplotLayer({ id:'chepauk-outer', data:[{pos:CHEPAUK}], radiusMinPixels:22, getPosition:(d:any)=>d.pos, getFillColor:[239,68,68,40] as any, stroked:false }));
    layers.push(new ScatterplotLayer({ id:'chepauk', data:[{pos:CHEPAUK}], radiusMinPixels:12, getPosition:(d:any)=>d.pos, getFillColor:[239,68,68,240] as any, getLineColor:[255,255,255] as any, stroked:true, lineWidthMinPixels:2 }));
    layers.push(new TextLayer({ id:'chepauk-label', data:[{pos:[CHEPAUK[0],CHEPAUK[1]+0.007],text:'🏏 Chepauk'}], getPosition:(d:any)=>d.pos, getText:(d:any)=>d.text, getSize:13, getColor:[253,211,77,220] as any, billboard:false }));
  }

  // Step 2+: Velachery rain marker
  if (step >= 2) {
    layers.push(new ScatterplotLayer({ id:'rain', data:[{pos:[80.2150,12.9745]}], radiusMinPixels:16, getPosition:(d:any)=>d.pos, getFillColor:[29,78,216,200] as any, getLineColor:[255,255,255] as any, stroked:true, lineWidthMinPixels:2 }));
    layers.push(new TextLayer({ id:'rain-label', data:[{pos:[80.2150,12.9745-0.008],text:'🌧️ Flood Risk'}], getPosition:(d:any)=>d.pos, getText:(d:any)=>d.text, getSize:11, getColor:[96,165,250,220] as any, billboard:false }));
  }

  // Step 3+: Highlight affected routes bright
  if (step >= 3) {
    layers.push(new PathLayer({ id:'23c-bright', data:[{path:ROUTE_PATHS['23C']}], widthMinPixels:4, getPath:(d:any)=>d.path, getColor:[245,158,11,240] as any, getWidth:4 }));
    layers.push(new PathLayer({ id:'21g-bright', data:[{path:ROUTE_PATHS['21G']}], widthMinPixels:4, getPath:(d:any)=>d.path, getColor:[59,130,246,240] as any, getWidth:4 }));
    layers.push(new PathLayer({ id:'29c-bright', data:[{path:ROUTE_PATHS['29C_n']}], widthMinPixels:3, getPath:(d:any)=>d.path, getColor:[239,68,68,200] as any, getWidth:3 }));
    layers.push(new PathLayer({ id:'9-bright', data:[{path:ROUTE_PATHS['9']}], widthMinPixels:3, getPath:(d:any)=>d.path, getColor:[168,85,247,200] as any, getWidth:3 }));
  }

  // Step 5+: Depot markers
  if (step >= 5) {
    const activeDepots = DEPOTS.filter(d => step >= 5);
    layers.push(new ScatterplotLayer({
      id:'depots', data: activeDepots,
      radiusMinPixels:10, getPosition:(d:any)=>d.pos,
      getFillColor:(d:any)=>d.id==='ADR'?[245,158,11,240]:[71,85,105,200] as any,
      getLineColor:[255,255,255] as any, stroked:true, lineWidthMinPixels:2
    }));
    layers.push(new TextLayer({
      id:'depot-labels', data: activeDepots.map(d=>({pos:[d.pos[0],d.pos[1]+0.007],text:d.id})),
      getPosition:(d:any)=>d.pos, getText:(d:any)=>d.text, getSize:11,
      getColor:[255,255,255,200] as any, billboard:false
    }));
  }

  // Step 6+: 21G dispatch path from ADR to Chepauk
  if (step >= 6) {
    layers.push(new PathLayer({
      id:'21g-dispatch',
      data:[{path:[ADR, ROUTE_PATHS['21G'][4], ROUTE_PATHS['21G'][3], CHEPAUK]}],
      widthMinPixels:5, getPath:(d:any)=>d.path, getColor:[34,197,94,255] as any, getWidth:5, dashJustified:true, dashGapPickable:true
    }));
    // 29C diversion (dim old, show new)
    layers.push(new PathLayer({ id:'29c-old', data:[{path:ROUTE_PATHS['29C_n']}], widthMinPixels:2, getPath:(d:any)=>d.path, getColor:[239,68,68,60] as any, getWidth:2 }));
    layers.push(new PathLayer({ id:'29c-divert', data:[{path:ROUTE_PATHS['29C_d']}], widthMinPixels:5, getPath:(d:any)=>d.path, getColor:[245,158,11,255] as any, getWidth:5 }));
  }

  // Step 10: Impact badge (scatterplot cluster at city center)
  if (step >= 10) {
    layers.push(new ScatterplotLayer({ id:'impact', data:[{pos:[80.2600,13.0500]}], radiusMinPixels:40, getPosition:(d:any)=>d.pos, getFillColor:[34,197,94,40] as any, stroked:false }));
    layers.push(new TextLayer({ id:'impact-label', data:[{pos:[80.2600,13.0500],text:'✅ Wait: 22→16 min (−27%)'}], getPosition:(d:any)=>d.pos, getText:(d:any)=>d.text, getSize:13, getColor:[34,197,94,240] as any, billboard:false }));
  }

  return (
    <div style={{ width:'100%', height:'100%', background:'#0f172a' }}>
      <DeckGL
        viewState={vs}
        onViewStateChange={(e:any) => setVs(e.viewState)}
        controller={true}
        layers={layers}
      >
        <Map mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json" />
      </DeckGL>
    </div>
  );
}
