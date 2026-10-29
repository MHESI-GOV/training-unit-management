"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { Building2, User, Phone, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { REGION_COLOR, REGION_LABEL, UNIT_TYPE_LABEL } from "@/lib/labels";

export type Pin = { unit_id: string; name: string; region: string; type: string; province: string | null; lat: number; lng: number };

type UnitCard = { coordinator_name: string | null; phone: string | null; has_image: boolean };

// The Leaflet map itself. Loaded only on the client (via next/dynamic ssr:false in MapSection),
// because Leaflet touches window/document at import time. CircleMarker is used instead of the
// default pin icon so there are no marker-image asset-path issues in the bundler, and so each
// pin can be colored by its region. Hovering a pin opens a hotel-style card (photo + name +
// region + location + coordinator + phone). It is a Popup (not a Tooltip) on purpose: Leaflet
// auto-pans the map so the card is ALWAYS fully in view — it is never clamped to "above" and never
// clips at an edge (the map shifts on X/Y as needed instead).
export default function UnitMapInner({ pins, height = 460 }: { pins: Pin[]; height?: number }) {
  // Card extras (coordinator / phone / has_image) are static per unit and independent of the
  // dashboard's year/region filters, so fetch them ONCE as a unit_id→card lookup and join here.
  const [cards, setCards] = useState<Record<string, UnitCard>>({});
  useEffect(() => {
    let active = true;
    createClient()
      .rpc("get_unit_map_cards")
      .then(({ data }) => {
        if (active && data) setCards(data as Record<string, UnitCard>);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <MapContainer
      center={[13.2, 100.9]}
      zoom={5}
      scrollWheelZoom={true}
      style={{ height, width: "100%", borderRadius: 12 }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <CloseOnMapLeave />
      {pins.map((p) => (
        <CircleMarker
          key={p.unit_id}
          center={[p.lat, p.lng]}
          radius={8}
          pathOptions={{ color: "#ffffff", weight: 2, fillColor: REGION_COLOR[p.region] ?? "#5d7087", fillOpacity: 0.95 }}
          // Open the card on hover. We deliberately do NOT close on the marker's own mouseout:
          // autoPan can shift the pin out from under the cursor (which would fire mouseout and make
          // the card flicker closed). Instead it closes when the cursor leaves the whole map
          // (CloseOnMapLeave) or when another pin is hovered (Leaflet's autoClose).
          eventHandlers={{ mouseover: (e) => e.target.openPopup() }}
        >
          <Popup
            className="unit-card-popup"
            closeButton={false}
            autoPan={true}
            autoPanPadding={[24, 24]}
            offset={[0, -6]}
            maxWidth={260}
            minWidth={260}
          >
            <UnitCardView pin={p} card={cards[p.unit_id]} />
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}

// Closes the open hover-card when the cursor leaves the whole map (mouseleave doesn't fire when
// moving onto child markers/popups, unlike Leaflet's map 'mouseout', so there's no flicker).
function CloseOnMapLeave() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    const onLeave = () => map.closePopup();
    el.addEventListener("mouseleave", onLeave);
    return () => el.removeEventListener("mouseleave", onLeave);
  }, [map]);
  return null;
}

function UnitCardView({ pin, card }: { pin: Pin; card?: UnitCard }) {
  const [imgOk, setImgOk] = useState(true);
  const color = REGION_COLOR[pin.region] ?? "#5d7087";
  const showImg = card?.has_image && imgOk;

  return (
    <div className="unit-card">
      <div className="unit-card-photo" style={{ background: `linear-gradient(135deg, ${color}, ${color}bb)` }}>
        {showImg ? (
          <img src={`/api/unit-photo/${pin.unit_id}`} alt={pin.name} onError={() => setImgOk(false)} />
        ) : (
          <Building2 size={34} color="#ffffff" strokeWidth={1.5} />
        )}
        <span className="unit-card-photo-badge" style={{ color }}>
          <MapPin size={15} />
        </span>
      </div>

      <div className="unit-card-titlerow">
        <span className="unit-card-name">{pin.name}</span>
        <span className="unit-card-pill" style={{ background: color }}>
          {REGION_LABEL[pin.region] ?? pin.region}
        </span>
      </div>

      <div className="unit-card-loc">
        <MapPin size={13} />
        {pin.province ? `${pin.province} · ` : ""}
        {UNIT_TYPE_LABEL[pin.type] ?? pin.type}
      </div>

      <div className="unit-card-chips">
        <span className="unit-card-chip" title={card?.coordinator_name || undefined}>
          <User size={14} />
          <span className="unit-card-chip-text">{card?.coordinator_name || "—"}</span>
        </span>
        <span className="unit-card-chip">
          <Phone size={14} />
          <span className="unit-card-chip-text">{card?.phone || "—"}</span>
        </span>
      </div>
    </div>
  );
}
