"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, useMapEvents, useMap } from "react-leaflet";

function ClickCapture({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Recenters only when `center` changes (i.e. after a search) — a plain map click sets the pin
// without yanking the view.
function Recenter({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, 14);
  }, [center, map]);
  return null;
}

export default function LocationPickerInner({
  position,
  center,
  onPick,
  readOnly = false,
}: {
  position: { lat: number; lng: number } | null;
  center: [number, number] | null;
  onPick: (lat: number, lng: number) => void;
  readOnly?: boolean;
}) {
  return (
    <MapContainer
      center={position ? [position.lat, position.lng] : [13.2, 100.9]}
      zoom={position ? 14 : 5}
      scrollWheelZoom={false}
      style={{ height: 360, width: "100%", borderRadius: 12, cursor: readOnly ? "grab" : "crosshair" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      {!readOnly && <ClickCapture onPick={onPick} />}
      <Recenter center={center} />
      {position && (
        <CircleMarker
          center={[position.lat, position.lng]}
          radius={9}
          pathOptions={{ color: "#ffffff", weight: 2, fillColor: "#17569d", fillOpacity: 0.95 }}
        />
      )}
    </MapContainer>
  );
}
