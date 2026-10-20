"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { REGION_COLOR, REGION_LABEL, UNIT_TYPE_LABEL } from "@/lib/labels";

export type Pin = { unit_id: string; name: string; region: string; type: string; province: string | null; lat: number; lng: number };

// The Leaflet map itself. Loaded only on the client (via next/dynamic ssr:false in MapSection),
// because Leaflet touches window/document at import time. CircleMarker is used instead of the
// default pin icon so there are no marker-image asset-path issues in the bundler, and so each
// pin can be colored by its region.
export default function UnitMapInner({ pins, height = 460 }: { pins: Pin[]; height?: number }) {
  return (
    <MapContainer
      center={[13.2, 100.9]}
      zoom={5}
      scrollWheelZoom={false}
      style={{ height, width: "100%", borderRadius: 12 }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      {pins.map((p) => (
        <CircleMarker
          key={p.unit_id}
          center={[p.lat, p.lng]}
          radius={8}
          pathOptions={{ color: "#ffffff", weight: 2, fillColor: REGION_COLOR[p.region] ?? "#5d7087", fillOpacity: 0.95 }}
        >
          <Popup>
            <strong>{p.name}</strong>
            <br />
            {REGION_LABEL[p.region] ?? p.region} · {UNIT_TYPE_LABEL[p.type] ?? p.type}
            {p.province ? (
              <>
                <br />
                {p.province}
              </>
            ) : null}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
