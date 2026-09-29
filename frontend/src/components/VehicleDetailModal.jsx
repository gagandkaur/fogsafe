const LABEL = { ahead: 'Ahead', behind: 'Behind', left: 'Left', right: 'Right' };
// Full technical panel, shown on tap — kept separate from the driving-mode status card (point 19/14).
export default function VehicleDetailModal({ item, onClose }) {
  if (!item) return null;
  const { vehicle: v, analysis: a } = item;
  const rows = [
    ['Vehicle ID', v.vehicleId], ['Distance', `${a.distanceM} m`],
    ['Relative direction', LABEL[a.direction]], ['Relevance', a.relevance],
    ['Speed', `${Math.round(v.speedKmh)} km/h`], ['Heading', `${Math.round(v.heading)}°`],
    ['Closing speed', `${a.closingSpeedMs} m/s`], ['Estimated TTC', a.ttcS == null ? 'N/A' : `${a.ttcS} s`],
    ['Visual range status', a.visual.replace(/_/g, ' ')], ['Risk status', a.risk],
    ['GPS confidence', a.lowConfidence ? 'Low' : 'OK'], ['Source', v.source],
    ['Last update', v.ageMs != null ? `${Math.round(v.ageMs / 1000)} s ago` : 'just now'],
  ];
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="row"><b>VEHICLE #{v.vehicleId}</b><button onClick={onClose}>✕</button></div>
        {rows.map(([k, val]) => <div key={k} className="detail-row"><span>{k}</span><b>{val}</b></div>)}
      </div>
    </div>);
}
