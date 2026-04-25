~"use client"

import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import DeckGL from '@deck.gl/react';
import { PathLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import { Map } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

const CHENNAI = { minLat:12.75, maxLat:13.35, minLng:79.90, maxLng:80.45 };
function inChennai(lat:number,lng:number){return lat>CHENNAI.minLat&&lat<CHENNAI.maxLat&&lng>CHENNAI.minLng&&lng<CHENNAI.maxLng;}

const ROUTE_PALETTE:Record<string,[number,number,number]>={R001:[239,68,68],R002:[59,130,246],R003:[34,197,94],R004:[245,158,11],R005:[168,85,247],R006:[6,182,212],R007:[249,115,22],R008:[236,72,153],R009:[132,204,16],R010:[20,184,166]};
function getBusColor(s:string):[number,number,number]{if(s==='overloaded')return[220,38,38];if(s==='delayed')return[239,68,68];if(s==='crowded')return[245,158,11];if(s==='at_stop')return[59,130,246];return[34,197,94];}

export const DEMO_PATHS:Record<string,[number,number][]>={
  '23C':[[80.2876,13.0956],[80.2757,13.0827],[80.2613,13.0770],[80.2501,13.0641],[80.2614,13.0524],[80.2323,13.0388],[80.2202,13.0227],[80.2206,13.0068],[80.1574,12.9673],[80.1417,12.9516],[80.1000,12.9249]],
  '21G':[[80.2876,13.0956],[80.2757,13.0827],[80.2793,13.0622],[80.2818,13.0523],[80.2677,13.0330],[80.2599,13.0044],[80.2584,12.9833],[80.1574,12.9673],[80.1000,12.9249]],
  '29C_n':[[80.2757,13.0827],[80.2323,13.0388],[80.2202,13.0227],[80.1965,12.9893],[80.2150,12.9745],[80.2209,12.9815]],
  '29C_d':[[80.2757,13.0827],[80.2323,13.0388],[80.2202,13.0227],[80.1965,12.9893],[80.1963,12.9211],[80.2415,12.9587],[80.2209,12.9815]],
  '9':[[80.2876,13.0956],[80.2793,13.0622],[80.2494,13.1171],[80.3107,13.1666]],
};
export const CHEPAUK:[number,number]=[80.2793,13.0622];
export const ADR:[number,number]=[80.2599,13.0044];

export interface DemoLayer{type:'highlight'|'diversion'|'rain'|'spawned';routeIds?:string[];spawnedBuses?:Array<{id:string;pos:[number,number]}>}
export interface MapHandle{flyTo:(lng:number,lat:number,zoom:number)=>void}

interface Props{routes:any[];buses:any[];stops:any[];depots:any[];mapView?:'command'|'tracking';demoLayers?:DemoLayer[];onBusClick?:(b:any)=>void}

const UBOCCMap = forwardRef<MapHandle,Props>(function UBOCCMap({routes,buses,stops,depots,mapView='command',demoLayers=[],onBusClick},ref){
  type BT={from:[number,number];to:[number,number];t:number;speed:number;status:string;route_id:string};
  const targetsRef=useRef<Record<string,BT>>({});
  const animRef=useRef<number|null>(null);
  const [vs,setVs]=React.useState({longitude:80.25,latitude:13.06,zoom:12,pitch:40,bearing:0});
  const [animBuses,setAnimBuses]=React.useState<Array<{id:string;pos:[number,number];status:string;route_id:string}>>([]);

  useEffect(()=>{
    buses.forEach(bus=>{
      const route=routes.find((r:any)=>r.route_id===bus.route_id);
      let lat=13.06,lng=80.25;
      if(route?.path&&route.path[bus.current_position_index]){const pt=route.path[bus.current_position_index];lat=pt[0];lng=pt[1];}
      if(!inChennai(lat,lng))return;
      const ex=targetsRef.current[bus.bus_id];
      const cur:[number,number]=ex?[ex.from[0]+(ex.to[0]-ex.from[0])*ex.t,ex.from[1]+(ex.to[1]-ex.from[1])*ex.t]:[lng,lat];
      targetsRef.current[bus.bus_id]={from:cur,to:[lng,lat],t:0,speed:bus.speed||15,status:bus.status||'in_transit',route_id:bus.route_id};
    });
  },[buses,routes]);

  useEffect(()=>{
    const interval = setInterval(()=>{
      const snap:typeof animBuses=[];
      const entries = Object.entries(targetsRef.current);
      if (entries.length === 0) {
        // If empty, avoid updating state repeatedly to prevent infinite loops
        return;
      }
      entries.forEach(([id,s])=>{
        const step=Math.max(0.006,s.speed/1800);
        s.t=Math.min(1,s.t+step);
        const x=s.from[0]+(s.to[0]-s.from[0])*s.t;
        const y=s.from[1]+(s.to[1]-s.from[1])*s.t;
        snap.push({id,pos:[x,y],status:s.status,route_id:s.route_id});
      });
      setAnimBuses(snap);
    }, 100);
    return()=>clearInterval(interval);
  },[]);

  useImperativeHandle(ref,()=>({flyTo(lng:number,lat:number,zoom:number){setVs(v=>({...v,longitude:lng,latitude:lat,zoom,transitionDuration:1200}));}}));

  const chennaiStops=stops.filter((s:any)=>s.lat&&s.lon&&inChennai(s.lat,s.lon));
  const layers:any[]=[];

  layers.push(new PathLayer({id:'routes',data:routes.filter((r:any)=>r.path?.length>1),widthMinPixels:2,getPath:(d:any)=>d.path.map((p:any)=>[p[1],p[0]]),getColor:(d:any)=>{const c=ROUTE_PALETTE[d.route_id]||[71,85,105];return[...c,mapView==='tracking'?180:90] as any;},getWidth:3}));

  if(mapView==='tracking'&&vs.zoom>12){
    layers.push(new ScatterplotLayer({id:'stops',data:chennaiStops,radiusMinPixels:3,radiusMaxPixels:6,getPosition:(d:any)=>[d.lon,d.lat],getFillColor:[59,130,246,180],getLineColor:[255,255,255,100],stroked:true,lineWidthMinPixels:1}));
  }

  layers.push(new ScatterplotLayer({id:'depots',data:depots,radiusMinPixels:9,getPosition:(d:any)=>[d.lon,d.lat],getFillColor:[139,92,246,220],getLineColor:[255,255,255],stroked:true,lineWidthMinPixels:2}));

  demoLayers.forEach((dl,i)=>{
    if(dl.type==='highlight'&&dl.routeIds){
      const colorMap:Record<string,[number,number,number,number]>={'23C':[245,158,11,240],'21G':[59,130,246,240],'29C_n':[239,68,68,200],'9':[168,85,247,220]};
      layers.push(new PathLayer({id:`hl-${i}`,data:dl.routeIds.map(id=>({path:DEMO_PATHS[id],id})).filter(d=>d.path),widthMinPixels:5,getPath:(d:any)=>d.path,getColor:(d:any)=>colorMap[d.id]||[255,255,255,200] as any,getWidth:5}));
    }
    if(dl.type==='diversion'){
      layers.push(new PathLayer({id:`div-old-${i}`,data:[{path:DEMO_PATHS['29C_n']}],widthMinPixels:2,getPath:(d:any)=>d.path,getColor:[239,68,68,60] as any,getWidth:2}));
      layers.push(new PathLayer({id:`div-new-${i}`,data:[{path:DEMO_PATHS['29C_d']}],widthMinPixels:5,getPath:(d:any)=>d.path,getColor:[245,158,11,255] as any,getWidth:5}));
      layers.push(new PathLayer({id:`div-21g-${i}`,data:[{path:[ADR,DEMO_PATHS['21G'][4],DEMO_PATHS['21G'][3],CHEPAUK]}],widthMinPixels:4,getPath:(d:any)=>d.path,getColor:[34,197,94,255] as any,getWidth:4}));
    }
    if(dl.type==='rain'){
      layers.push(new ScatterplotLayer({id:`rain-${i}`,data:[{pos:CHEPAUK},{pos:[80.2323,13.0388]},{pos:[80.2150,12.9745]}],radiusMinPixels:50,getPosition:(d:any)=>d.pos,getFillColor:[29,78,216,50],stroked:false}));
    }
    if(dl.type==='spawned'&&dl.spawnedBuses){
      layers.push(new ScatterplotLayer({id:`spawned-${i}`,data:dl.spawnedBuses,radiusMinPixels:9,getPosition:(d:any)=>d.pos,getFillColor:[34,197,94,230],getLineColor:[255,255,255],stroked:true,lineWidthMinPixels:2}));
    }
  });

  layers.push(new ScatterplotLayer({id:'buses',data:animBuses,pickable:true,radiusMinPixels:7,radiusMaxPixels:11,getPosition:(d:any)=>d.pos,getFillColor:(d:any)=>getBusColor(d.status) as any,getLineColor:[255,255,255,200],stroked:true,lineWidthMinPixels:1.5,onClick:(info:any)=>{if(info.object&&onBusClick)onBusClick(info.object);}}));
  if(vs.zoom>12.5){layers.push(new TextLayer({id:'bus-labels',data:animBuses.slice(0,25),getPosition:(d:any)=>d.pos,getText:(d:any)=>(d.route_id||'').replace('R00','').replace('R0',''),getSize:9,getColor:[255,255,255,200],getAlignmentBaseline:'center' as any,getTextAnchor:'middle' as any,billboard:false}));}
  layers.push(new ScatterplotLayer({id:'chepauk',data:[{pos:CHEPAUK}],radiusMinPixels:10,getPosition:(d:any)=>d.pos,getFillColor:[245,158,11,240],getLineColor:[253,211,77],stroked:true,lineWidthMinPixels:3}));

  return(
    <div className="relative w-full h-full bg-[#0f172a]">
      <DeckGL viewState={vs} onViewStateChange={(e:any)=>setVs(e.viewState)} controller={true} layers={layers}>
        <Map mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"/>
      </DeckGL>
      <div style={{position:'absolute',bottom:16,right:16,zIndex:10,background:'rgba(245,158,11,0.15)',border:'1px solid rgba(245,158,11,0.4)',borderRadius:8,padding:'5px 10px',fontSize:11,color:'#FCD34D',backdropFilter:'blur(8px)'}}>
        🏏 MA Chidambaram — Chepauk
      </div>
    </div>
  );
});

export default UBOCCMap;
