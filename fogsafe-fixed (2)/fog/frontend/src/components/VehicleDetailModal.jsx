import { useEffect } from 'react';

const LABEL = { ahead: 'Ahead', behind: 'Behind', left: 'Left', right: 'Right' };
// Full technical panel, shown on tap; kept separate from the driving-mode status block.
export default function VehicleDetailModal({ item, onClose }) {
  useEffect(() => {
    if (!item) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [item, onClose]);

  if (!item) return null;
  const { vehicle: v, analysis: a } = item;
  const rows = [
    ['Distance', `${a.distanceM} m`],
    ['Relative direction', LABEL[a.direction]],
    ['Relevance', a.relevance.replace(/_/g, ' ').toLowerCase()],
    ['Speed', `${Math.round(v.speedKmh)} km/h`],
    ['Heading', `${Math.round(v.heading)}°`],
    ['Closing speed', `${a.closingSpeedMs} m/s`],
    ['Time to collision', a.ttcS == null ? 'N/A' : `${a.ttcS} s`],
    ['Visual range', a.visual === 'BEYOND_VISUAL_RANGE' ? 'Beyond' : 'Within'],
    ['Risk', a.risk.charAt(0) + a.risk.slice(1).toLowerCase()],
    ['GPS confidence', a.lowConfidence ? 'Low' : 'OK'],
    ['Source', v.source ?? 'n/a'],
    ['Last update', v.ageMs != null ? `${Math.round(v.ageMs / 1000)} s ago` : 'just now'],
  ];
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="row">
          <b>Vehicle {v.vehicleId}</b>
          <button onClick={onClose}>Close</button>
        </div>
        {rows.map(([k, val]) => (
          <div key={k} className="detail-row">
            <span>{k}</span>
            <b>{val}</b>
          </div>
        ))}
      </div>
    </div>
  );
}
