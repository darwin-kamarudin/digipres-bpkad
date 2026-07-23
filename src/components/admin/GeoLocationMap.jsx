import React from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const draftIcon = new L.Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  className: 'hue-rotate-[220deg]',
});

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function GeoLocationMap({ locations = [], draft, onDraftMove, onPickNew, onMarkerClick, center, zoom = 14 }) {
  return (
    <div className="rounded-xl overflow-hidden border-2 border-slate-200 shadow-sm" style={{ height: 380 }}>
      <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onPick={onPickNew} />

        {/* Titik-titik lokasi yang sudah tersimpan */}
        {locations.map((loc) => (
          <React.Fragment key={loc.id}>
            <Circle
              center={[loc.lat, loc.lng]}
              radius={Number(loc.radius) || 0}
              pathOptions={{ color: '#dc2626', fillColor: '#dc2626', fillOpacity: 0.15 }}
            />
            <Marker
              position={[loc.lat, loc.lng]}
              eventHandlers={{ click: () => onMarkerClick && onMarkerClick(loc) }}
            />
          </React.Fragment>
        ))}

        {/* Titik draft yang sedang diedit/ditambahkan (bisa digeser) */}
        {draft && draft.lat != null && draft.lng != null && (
          <>
            <Circle
              center={[draft.lat, draft.lng]}
              radius={Number(draft.radius) || 0}
              pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.2 }}
            />
            <Marker
              position={[draft.lat, draft.lng]}
              icon={draftIcon}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const { lat, lng } = e.target.getLatLng();
                  onDraftMove(lat, lng);
                },
              }}
            />
          </>
        )}
      </MapContainer>
    </div>
  );
}
