import { useEffect, useRef } from 'react';
import L from 'leaflet';

const COLORS = { GREEN: '#22c55e', YELLOW: '#eab308', RED: '#ef4444', CRITICAL: '#b91c1c' };

const userIcon = (heading) => L.divIcon({ className: '', iconSize: [28, 28],
  html: `<div class="user-marker" style="transform:rotate(${heading}deg)">▲</div>` });

// Normal marker inside visibility; dashed "digital detection" marker beyond it.
const vehicleIcon = (a, selected) => L.divIcon({ className: '', iconSize: [30, 30],
  html: `<div class="veh ${a.visual === 'BEYOND_VISUAL_RANGE' ? 'digital' : ''} ${a.risk === 'CRITICAL' ? 'blink' : ''} ${selected ? 'sel' : ''}"
   style="background:${COLORS[a.risk]}">${a.risk === 'GREEN' ? '🚗' : '⚠'}</div>` });

export default function MapView({ user, items, visibilityM, fogOn, selectedId, onSelect }) {
  const el = useRef(null), map = useRef(null), layers = useRef({ vehicles: {} });

  useEffect(() => {
    map.current = L.map(el.current, { zoomControl: false }).setView([user.lat, user.lng], 18);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map.current);
    layers.current.user = L.marker([user.lat, user.lng], { icon: userIcon(user.heading), zIndexOffset: 1000 }).addTo(map.current);
    layers.current.fog = L.circle([user.lat, user.lng], { radius: visibilityM, color: '#64748b', weight: 2,
      dashArray: '6 6', fillColor: '#cbd5e1', fillOpacity: 0.35 });
    return () => map.current.remove();
  }, []);

  useEffect(() => {
    const { user: um, fog, vehicles } = layers.current, pos = [user.lat, user.lng];
    um.setLatLng(pos).setIcon(userIcon(user.heading));
    map.current.setView(pos, map.current.getZoom(), { animate: false });
    fog.setLatLng(pos).setRadius(visibilityM);
    if (fogOn) fog.addTo(map.current); else fog.remove();

    const alive = new Set(items.map((i) => i.vehicle.vehicleId));
    Object.keys(vehicles).forEach((id) => { if (!alive.has(id)) { vehicles[id].remove(); delete vehicles[id]; } });
    items.forEach(({ vehicle: v, analysis: a }) => {
      const icon = vehicleIcon(a, v.vehicleId === selectedId);
      if (!vehicles[v.vehicleId])
        vehicles[v.vehicleId] = L.marker([v.lat, v.lng], { icon }).addTo(map.current)
          .on('click', () => onSelect(v.vehicleId));
      vehicles[v.vehicleId].setLatLng([v.lat, v.lng]).setIcon(icon);
    });
  }, [user, items, visibilityM, fogOn, selectedId]);

  return <div ref={el} className="map" />;
}
