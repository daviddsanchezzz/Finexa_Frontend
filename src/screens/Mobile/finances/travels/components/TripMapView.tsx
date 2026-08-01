import React, { useState, useEffect, useMemo, useRef } from "react";
import { View, Text, ActivityIndicator, Platform } from "react-native";
import { TripPlanItem } from "./TripPlanningSection";

// Only import WebView on native — react-native-webview doesn't support web
let NativeWebView: any = null;
if (Platform.OS !== "web") {
  NativeWebView = require("react-native-webview").default;
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface GeoPoint { lat: number; lng: number }
interface MapMarker extends GeoPoint {
  title: string;
  color: string;
  items: string[];
  order: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TYPE_COLOR: Partial<Record<string, string>> = {
  accommodation: "#16A34A",
  flight: "#2563EB",
  transport_destination: "#0EA5E9",
  transport_local: "#0EA5E9",
  transport: "#0EA5E9",
  restaurant: "#EA580C",
  cafe: "#EA580C",
};
const DEFAULT_COLOR = "#A855F7";

// ─── Module-level geocoding cache (persists across tab switches & navigation) ─

const GEO_CACHE = new Map<string, GeoPoint | null>();

async function geocode(query: string): Promise<GeoPoint | null> {
  if (GEO_CACHE.has(query)) return GEO_CACHE.get(query)!;
  try {
    const url =
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=0`;
    const res = await fetch(url, { headers: { "User-Agent": "SpendlyApp/1.0" } });
    const data = await res.json();
    const result = data[0] ? { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) } : null;
    GEO_CACHE.set(query, result);
    return result;
  } catch {
    GEO_CACHE.set(query, null);
    return null;
  }
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function buildLeafletHTML(markers: MapMarker[]): string {
  const safe = markers.map(m => ({ ...m, title: esc(m.title), items: m.items.map(esc) }));
  const ms = JSON.stringify(safe);
  const rt = JSON.stringify(safe.slice().sort((a, b) => a.order - b.order));

  return `<!DOCTYPE html><html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;background:#f1f5f9}
#map{width:100%;height:100%}
.leaflet-popup-content-wrapper{border-radius:14px;padding:0;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.15)}
.leaflet-popup-content{margin:0;min-width:140px;max-width:210px}
.pu{padding:10px 13px}
.pu-title{font-weight:700;font-size:13px;color:#0f172a;font-family:-apple-system,sans-serif;margin-bottom:4px}
.pu-item{font-size:11px;color:#475569;font-family:-apple-system,sans-serif;line-height:1.6}
</style>
</head>
<body><div id="map"></div>
<script>
(function(){
  var ms=${ms},rt=${rt};
  if(!ms.length){
    document.getElementById('map').innerHTML='<div style="display:flex;align-items:center;justify-content:center;height:100%;font-family:sans-serif;color:#94a3b8;font-size:14px;padding:24px;text-align:center">Sin ubicaciones disponibles</div>';
    return;
  }
  var avgLat=ms.reduce(function(s,m){return s+m.lat},0)/ms.length;
  var avgLng=ms.reduce(function(s,m){return s+m.lng},0)/ms.length;
  var map=L.map('map',{zoomControl:true,attributionControl:false}).setView([avgLat,avgLng],7);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
  if(rt.length>1){
    L.polyline(rt.map(function(p){return[p.lat,p.lng]}),{
      color:'#2563EB',weight:2.5,opacity:0.5,dashArray:'8,6'
    }).addTo(map);
  }
  ms.forEach(function(m,i){
    var icon=L.divIcon({
      className:'',
      html:'<div style="width:32px;height:32px;background:'+m.color+';border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center"><span style="transform:rotate(45deg);color:white;font-size:11px;font-weight:800;font-family:sans-serif">'+(i+1)+'</span></div>',
      iconSize:[32,32],iconAnchor:[16,32],popupAnchor:[0,-36]
    });
    var items=m.items.map(function(t){return'<div class="pu-item">· '+t+'</div>'}).join('');
    L.marker([m.lat,m.lng],{icon:icon})
      .bindPopup('<div class="pu"><div class="pu-title">'+m.title+'</div>'+items+'</div>')
      .addTo(map);
  });
  var bounds=L.latLngBounds(ms.map(function(m){return[m.lat,m.lng]}));
  map.fitBounds(bounds,{padding:[50,50],maxZoom:12});
})();
<\/script>
</body></html>`;
}

// ─── Platform-specific map frame ─────────────────────────────────────────────

function WebIframe({ html }: { html: string }) {
  const containerRef = useRef<any>(null);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const node = containerRef.current as unknown as HTMLElement;
    if (!node) return;

    // Revoke previous blob URL
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    node.innerHTML = "";

    // blob: URL gives the iframe a real origin so external CDN scripts load
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    blobUrlRef.current = url;

    const iframe = document.createElement("iframe");
    iframe.src = url;
    iframe.style.cssText = "width:100%;height:100%;border:none;display:block;";
    iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");
    node.appendChild(iframe);

    return () => {
      node.innerHTML = "";
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [html]);

  return <View ref={containerRef} style={{ flex: 1 }} />;
}

function MapFrame({ html }: { html: string }) {
  if (Platform.OS === "web") {
    return <WebIframe html={html} />;
  }
  return (
    <NativeWebView
      source={{ html }}
      style={{ flex: 1 }}
      scrollEnabled={false}
      originWhitelist={["*"]}
      javaScriptEnabled
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TripMapView({ planItems }: { planItems: TripPlanItem[] }) {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState("");
  const [html, setHtml] = useState("");

  const locRequests = useMemo(() => {
    const seen = new Map<string, { color: string; displayName: string; itemTitle: string; order: number }[]>();

    const push = (query: string, color: string, displayName: string, itemTitle: string, order: number) => {
      if (!query.trim()) return;
      if (!seen.has(query)) seen.set(query, []);
      seen.get(query)!.push({ color, displayName, itemTitle, order });
    };

    planItems.forEach((item, idx) => {
      const color = TYPE_COLOR[item.type] ?? DEFAULT_COLOR;
      if (item.type === "accommodation" && item.accommodationDetails) {
        const d = item.accommodationDetails;
        const q = [d.address, d.city, d.country].filter(Boolean).join(", ");
        if (q) push(q, "#16A34A", d.city || d.name || item.title, item.title, idx);
      } else if (item.location) {
        push(item.location, color, item.location, item.title, idx);
      }
      if (item.destinationTransport?.fromName) {
        push(item.destinationTransport.fromName, "#0EA5E9", item.destinationTransport.fromName, item.title, idx);
      }
      if (item.destinationTransport?.toName) {
        push(item.destinationTransport.toName, "#0EA5E9", item.destinationTransport.toName, item.title, idx + 0.5);
      }
    });

    return seen;
  }, [planItems]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      const entries = [...locRequests.entries()];
      if (entries.length === 0) {
        setHtml(buildLeafletHTML([]));
        setLoading(false);
        return;
      }

      const result: MapMarker[] = [];

      for (let i = 0; i < entries.length; i++) {
        if (cancelled) return;
        const [query, metas] = entries[i];
        setProgress(`${i + 1} / ${entries.length}`);

        const geo = await geocode(query);

        if (geo) {
          const nearby = result.find(
            m => Math.abs(m.lat - geo.lat) < 0.002 && Math.abs(m.lng - geo.lng) < 0.002
          );
          if (nearby) {
            metas.forEach(m => {
              if (!nearby.items.includes(m.itemTitle)) nearby.items.push(m.itemTitle);
            });
          } else {
            const first = metas[0];
            result.push({
              lat: geo.lat, lng: geo.lng,
              title: first.displayName,
              color: first.color,
              items: metas.map(m => m.itemTitle),
              order: Math.min(...metas.map(m => m.order)),
            });
          }
        }

        if (i < entries.length - 1) await sleep(1150);
      }

      if (!cancelled) {
        setHtml(buildLeafletHTML(result));
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [locRequests]);

  return (
    <View style={{ flex: 1, minHeight: 420, borderRadius: 16, overflow: "hidden", marginTop: 8 }}>
      {loading && (
        <View style={{
          position: "absolute",
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "#f8fafc",
          alignItems: "center", justifyContent: "center",
          zIndex: 10,
        }}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={{ marginTop: 14, fontSize: 13, fontWeight: "700", color: "#334155" }}>
            Geocodificando paradas...
          </Text>
          {progress ? (
            <Text style={{ marginTop: 4, fontSize: 11, color: "#94A3B8" }}>
              {progress} ubicaciones procesadas
            </Text>
          ) : null}
          <Text style={{ marginTop: 6, fontSize: 10, color: "#CBD5E1" }}>
            OpenStreetMap · 1 req/seg
          </Text>
        </View>
      )}
      {html ? <MapFrame html={html} /> : null}
    </View>
  );
}
