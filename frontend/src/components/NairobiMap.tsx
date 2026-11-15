import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, ZoomControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useMapEvents } from "react-leaflet";
import type { EmergencyFacility, Hotspot, OptimizedRoute } from "../types/analytics";

type Props = { points: Hotspot[]; onSelect?: (point: Hotspot) => void; selectedId?: string; route?: OptimizedRoute | null; facilities?: EmergencyFacility[]; compact?: boolean; preview?: boolean; heatmap?: boolean; sourceLabel?: string; onMapChoose?: (latitude: number, longitude: number) => void; chosenCoordinate?: [number, number] | null };

const tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const riskColors = { high: "#dc2626", moderate: "#f59e0b", lower: "#16a34a" };

function MapClickHandler({ onMapChoose }: { onMapChoose: (latitude: number, longitude: number) => void }) {
  useMapEvents({ click: (event) => onMapChoose(event.latlng.lat, event.latlng.lng) });
  return null;
}

export function NairobiMap({ points, onSelect, selectedId, route, facilities = [], compact = false, preview = false, heatmap = false, sourceLabel = "Demo sample locations", onMapChoose, chosenCoordinate }: Props) {
  return <div className={`nairobi-map ${compact ? "map-compact" : ""} ${preview ? "map-preview" : ""}`}>
    <MapContainer center={[-1.2865, 36.8172]} zoom={11.8} minZoom={9} maxZoom={18} scrollWheelZoom={!preview} zoomControl={false} dragging={!preview} doubleClickZoom={!preview} attributionControl>
      <TileLayer url={tileUrl} attribution={attribution} maxZoom={19} />
      {!preview && <ZoomControl position="topright" />}
      {onMapChoose && <MapClickHandler onMapChoose={onMapChoose} />}
      {points.map((point) => {
        const color = riskColors[point.level];
        const selected = point.id === selectedId;
        const radius = heatmap ? Math.min(36, 10 + Math.sqrt(point.incidents) * .7) : selected ? 10 : 7;
        return <CircleMarker key={point.id} center={[point.latitude, point.longitude]} radius={radius} pathOptions={{ color, fillColor: color, fillOpacity: heatmap ? .16 : .2, weight: heatmap ? 1 : selected ? 3 : 2 }} eventHandlers={{ click: () => onSelect?.(point) }}>
          <Tooltip direction="top" offset={[0, -7]}><strong>{point.name}</strong><br />{point.incidents} sample records · {point.level} cluster</Tooltip>
        </CircleMarker>;
      })}
      {facilities.map((facility) => <CircleMarker key={facility.id} center={[facility.latitude, facility.longitude]} radius={facility.type === "proposed" ? 7 : facility.type === "hospital" ? 6 : 5} pathOptions={{ color: "#fff", fillColor: facility.type === "hospital" ? "#2563eb" : facility.type === "proposed" ? "#8b5cf6" : "#16a34a", fillOpacity: 1, weight: 2 }}><Tooltip>{facility.name} · {facility.type}</Tooltip></CircleMarker>)}
      {chosenCoordinate && <CircleMarker center={chosenCoordinate} radius={9} pathOptions={{ color: "#fff", fillColor: "#dc2626", fillOpacity: .95, weight: 2 }}><Tooltip>Selected report location</Tooltip></CircleMarker>}
      {route && route.routeCoordinates.length > 1 && <><Polyline positions={route.routeCoordinates} pathOptions={{ color: "#2563eb", weight: 5, opacity: .88, dashArray: "8 7" }} /><CircleMarker center={route.routeCoordinates.at(-1)!} radius={8} pathOptions={{ color: "#fff", fillColor: "#2563eb", fillOpacity: 1, weight: 2 }}><Tooltip>{route.facilityName}</Tooltip></CircleMarker></>}
    </MapContainer>
    <div className="map-attribution-label">{sourceLabel}</div>
  </div>;
}
