import React, { useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet';
import L from 'leaflet';

// Fix default marker icons for Leaflet when using bundlers
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const ChangeView = ({ center, zoom }) => {
  const map = useMap();
  map.setView(center, zoom);
  return null;
};

// NEW: Helper function to determine the status level from confidence
const getConfidenceLevel = (confidence) => {
  if (confidence < 0.35) return 'Very Low';
  if (confidence < 0.6) return 'Low';
  if (confidence < 0.85) return 'Medium';
  return 'High';
};

const MapView = ({
  center = [20.5937, 78.9629],
  zoom = 5,
  height = '256px',
  className = '',
  markers = [], // [{ position: [lat, lng], popup: 'text' }]
  hotspots = [], // [{ lat, lng, confidence(0..1) }]
  safetyCircles = [] // [{ lat, lng, isSafe, color, timestamp }]
}) => {
  const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  const style = useMemo(() => ({ height, width: '100%' }), [height]);

  const visibleHotspots = (hotspots || []).filter((h) => (h.confidence ?? 0) >= 0.35);



  return (
    <div className={className} style={style}>
      <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
        <ChangeView center={center} zoom={zoom} />
        <TileLayer url={tileUrl} attribution={attribution} />
        {visibleHotspots.map((h, idx) => {
          const c = Math.max(0, Math.min(1, h.confidence ?? 0));
          const fillOpacity = 0.25 + c * 0.5; // 0.25..0.75
          const color = `rgba(220, 38, 38, ${Math.min(1, 0.4 + c * 0.5)})`; // red-600 stroke
          const fillColor = `rgba(239, 68, 68, ${fillOpacity})`; // red-500 fill
          const radius = 10 + c * 20; // pixels for CircleMarker

          // Get the descriptive level for the popup
          const confidenceLevel = getConfidenceLevel(c);

          return (
            <CircleMarker
              key={`hs-${idx}`}
              center={[h.lat, h.lng]}
              radius={radius}
              pathOptions={{ color, fillColor, fillOpacity }}
            >
              <Popup>
                <div style={{ minWidth: 160 }}>
                  {/* UPDATED: Display the new confidence level */}
                  <div><strong>Level:</strong> {confidenceLevel}</div>
                  <div><strong>Confidence:</strong> {(c * 100).toFixed(0)}%</div>
                  {h.hazardType ? <div><strong>Type:</strong> {h.hazardType}</div> : null}
                  {h.status ? <div><strong>Status:</strong> {h.status}</div> : null}
                  {h.createdAt ? <div><strong>Time:</strong> {new Date(h.createdAt).toLocaleString()}</div> : null}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
        {markers.map((m, idx) => (
          <Marker key={idx} position={m.position}>
            {m.popup ? <Popup>{m.popup}</Popup> : null}
          </Marker>
        ))}
        
        {/* Render safety circles (green for safe, purple for not safe) */}
        {(safetyCircles || []).filter(circle => 
          circle && 
          typeof circle.lat === 'number' && 
          typeof circle.lng === 'number' && 
          circle.id && 
          circle.color
        ).map((circle) => (
          <CircleMarker
            key={circle.id}
            center={[circle.lat, circle.lng]}
            radius={25}
            pathOptions={{ 
              color: circle.color,
              fillColor: circle.color,
              fillOpacity: 0.4,
              weight: 3
            }}
          >
            <Popup>
              <div style={{ minWidth: 140 }}>
                <div><strong>Status:</strong> {circle.isSafe ? 'Safe Location' : 'Unsafe Location'}</div>
                <div><strong>Reported:</strong> {new Date(circle.timestamp).toLocaleString()}</div>
                <div><strong>Type:</strong> Safety Response</div>
                <div style={{ fontSize: '11px', marginTop: '4px', color: '#666' }}>
                  From database - expires in 48 hours
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapView;