import { useEffect, useRef } from 'react';
import L from 'leaflet';

const COLORS = { GREEN: '#2e7d32', YELLOW: '#c99a00', RED: '#c62828', CRITICAL: '#8e0000' };

const userIcon = (heading) =>
  L.divIcon({
    className: '',
    iconSize: [28, 28],
    html: `<div class="user-marker" style="transform:rotate(${heading}deg)">▲</div>`,
  });

// Normal marker inside visibility; dashed "digital detection" marker beyond it.
const vehicleIcon = (a, selected) => {
  const size = a.risk === 'CRITICAL' ? 18 : 14;
  const cls = [
    'veh',
    a.visual === 'BEYOND_VISUAL_RANGE' && 'digital',
    a.risk === 'CRITICAL' && 'crit',
    selected && 'sel',
  ]
    .filter(Boolean)
    .join(' ');
  return L.divIcon({
    className: '',
    iconSize: [size, size],
    html: `<div class="${cls}" style="background:${COLORS[a.risk]}"></div>`,
  });
};

export default function MapView({ user, items, visibilityM, fogOn, selectedId, onSelect }) {
  const el = useRef(null),
    map = useRef(null),
    layers = useRef({ vehicles: {} });

  useEffect(() => {
    map.current = L.map(el.current, { zoomControl: false }).setView([user.lat, user.lng], 18);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(map.current);
    layers.current.user = L.marker([user.lat, user.lng], { icon: userIcon(user.heading), zIndexOffset: 1000 }).addTo(
      map.current,
    );
    layers.current.fog = L.circle([user.lat, user.lng], {
      radius: visibilityM,
      color: '#1f3a5f',
      weight: 1,
      dashArray: '4 4',
      fillColor: '#1f3a5f',
      fillOpacity: 0.06,
    });
    return () => map.current.remove();
  }, []);

  useEffect(() => {
    const { user: um, fog, vehicles } = layers.current,
      pos = [user.lat, user.lng];
    um.setLatLng(pos).setIcon(userIcon(user.heading));
    map.current.setView(pos, map.current.getZoom(), { animate: false });
    fog.setLatLng(pos).setRadius(visibilityM);
    if (fogOn) fog.addTo(map.current);
    else fog.remove();

    const alive = new Set(items.map((i) => i.vehicle.vehicleId));
    Object.keys(vehicles).forEach((id) => {
      if (!alive.has(id)) {
        vehicles[id].remove();
        delete vehicles[id];
      }
    });
    items.forEach(({ vehicle: v, analysis: a }) => {
      const icon = vehicleIcon(a, v.vehicleId === selectedId);
      if (!vehicles[v.vehicleId])
        vehicles[v.vehicleId] = L.marker([v.lat, v.lng], { icon })
          .addTo(map.current)
          .on('click', () => onSelect(v.vehicleId));
      vehicles[v.vehicleId].setLatLng([v.lat, v.lng]).setIcon(icon);
    });
  }, [user, items, visibilityM, fogOn, selectedId]);

  return <div ref={el} className="map" />;
}
