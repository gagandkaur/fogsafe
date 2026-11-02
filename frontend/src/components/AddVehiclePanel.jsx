import { useState } from 'react';
// Custom-placement controls: distance/speed/direction sliders, in addition to the quick-preset buttons.
export default function AddVehiclePanel({ onAdd }) {
  const [along, setAlong] = useState(150);
  const [speed, setSpeed] = useState(40);
  const [cross, setCross] = useState(0);
  return (
    <div className="card">
      <div className="lbl">Custom vehicle</div>
      <label className="slab">
        Position: {along >= 0 ? `${along} m ahead` : `${-along} m behind`}
        <input type="range" min="-200" max="300" step="5" value={along} onChange={(e) => setAlong(+e.target.value)} />
      </label>
      <label className="slab">
        Offset: {cross === 0 ? 'same lane' : cross > 0 ? `${cross} m right` : `${-cross} m left`}
        <input type="range" min="-40" max="40" step="5" value={cross} onChange={(e) => setCross(+e.target.value)} />
      </label>
      <label className="slab">
        Speed: {speed} km/h
        <input type="range" min="0" max="120" step="5" value={speed} onChange={(e) => setSpeed(+e.target.value)} />
      </label>
      <div className="row">
        <button className="on" onClick={() => onAdd(along, speed, cross)}>
          Add vehicle
        </button>
      </div>
    </div>
  );
}
