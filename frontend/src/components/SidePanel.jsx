const VIS = [20, 40, 60, 100, 200];
const LABEL = { ahead: 'Ahead', behind: 'Behind', left: 'Left', right: 'Right' };

export function ConnectionStatus({ status }) {
  const m = { connected: '🟢 Connected', reconnecting: '🟡 Reconnecting', offline: '🔴 Offline' }[status];
  return <span className="conn">{m}</span>;
}
export function AlertBanner({ nearest, demoMsg, notice }) {
  const a = nearest?.analysis;
  if (a && (a.risk === 'RED' || a.risk === 'CRITICAL'))
    return <div className={`banner ${a.risk}`}>⚠ {a.risk === 'CRITICAL' ? 'BRAKE!' : 'COLLISION RISK'} · {a.distanceM} m {LABEL[a.direction]}{a.ttcS != null ? ` · ${a.ttcS} s` : ''}</div>;
  if (notice) return <div className="banner warn">{notice}</div>;
  return demoMsg ? <div className="banner demo">{demoMsg}</div> : null;
}
export function StatusCard({ nearest, visibilityM, fogOn }) {
  if (!fogOn) return <div className="card">Fog mode off</div>;
  const a = nearest?.analysis;
  return (
    <div className={`card status ${a ? a.risk : 'GREEN'}`}>
      <div className="small">🌫️ FOG SAFETY MODE · Visibility {visibilityM} m</div>
      {a ? (<>
        <div className="big">{a.distanceM} m {LABEL[a.direction]}</div>
        {a.visual === 'BEYOND_VISUAL_RANGE' && <div>⚠️ Beyond visual range</div>}
        <div className="small">Risk {a.risk} · TTC {a.ttcS == null ? 'N/A' : a.ttcS + ' s'}{a.lowConfidence ? ' · low GPS confidence' : ''}</div>
      </>) : <div>No vehicles nearby</div>}
    </div>);
}
export function ModeSwitch({ mode, setMode }) {
  return <div className="row">
    <button className={mode === 'sim' ? 'on' : ''} onClick={() => setMode('sim')}>Simulation</button>
    <button className={mode === 'real' ? 'on' : ''} onClick={() => setMode('real')}>Real phones</button></div>;
}
export function FogControls({ fogOn, setFogOn, visibilityM, setVisibilityM }) {
  return (<div className="card">
    <label><input type="checkbox" checked={fogOn} onChange={(e) => setFogOn(e.target.checked)} /> Fog mode</label>
    <div className="row">{VIS.map((v) => <button key={v} className={v === visibilityM ? 'on' : ''} onClick={() => setVisibilityM(v)}>{v} m</button>)}</div>
  </div>);
}
export function SimControls({ sim, onDemo, demoOn }) {
  return (<div className="card">
    <div className="row">
      <button className="demo" onClick={onDemo}>{demoOn ? '■ Stop demo' : '▶ Demo mode'}</button>
      <button onClick={() => sim.setRunning(!sim.running)}>{sim.running ? '⏸ Pause' : '▶ Run'}</button>
      <button onClick={sim.clear}>Clear</button></div>
    <div className="small">Add vehicle:</div>
    <div className="row">
      <button onClick={() => sim.addVehicle(180, 42)}>180 m @42</button>
      <button onClick={() => sim.addVehicle(120, 10)}>120 m @10</button>
      <button onClick={() => sim.addVehicle(-80, 60)}>80 m behind</button>
      <button onClick={() => sim.addVehicle(60, 40, 40, 270)}>Crossing</button></div>
  </div>);
}
export function RealControls({ rt, gpsNote }) {
  return (<div className="card">
    <div>{rt.joined ? <>You are <b>{rt.vehicleId ?? '…'}</b> · <ConnectionStatus status={rt.status} /></> : 'Not joined'}</div>
    {!rt.joined ? (<>
      <div className="small">Location is used only to show you to nearby FogSafe vehicles (temporary ID, no personal data).</div>
      <div className="row"><button className="demo" onClick={() => rt.join(null)}>Join as Vehicle (GPS)</button></div>
      <div className="small">No GPS? Test with fake GPS (open 2 tabs):</div>
      <div className="row"><button onClick={() => rt.join('A')}>Test vehicle A</button><button onClick={() => rt.join('B')}>Test vehicle B (180 m ahead)</button></div>
    </>) : <div className="row"><button onClick={rt.leave}>Leave</button></div>}
    {rt.message && <div className="err">{rt.message}</div>}
    {gpsNote && <div className="err">{gpsNote}</div>}
    {rt.joined && !rt.user && !rt.message && <div className="small">Waiting for GPS fix…</div>}
  </div>);
}
export function VehicleList({ items, selectedId, onSelect, onRemove }) {
  return (<div className="card">
    {items.length === 0 && <div className="small">No vehicles</div>}
    {items.map(({ vehicle: v, analysis: a }) => (
      <div key={v.vehicleId} className={`li ${v.vehicleId === selectedId ? 'sel' : ''}`} onClick={() => onSelect(v.vehicleId)}>
        <b>{v.vehicleId}</b> {a.distanceM} m {LABEL[a.direction]} · {Math.round(v.speedKmh)} km/h
        <span className={`pill ${a.risk}`}>{a.risk}</span>
        {a.visual === 'BEYOND_VISUAL_RANGE' && <span className="pill dig">digital</span>}
        {onRemove && <button className="x" onClick={(e) => { e.stopPropagation(); onRemove(v.vehicleId); }}>✕</button>}
        {v.vehicleId === selectedId && <div className="small">Heading {Math.round(v.heading)}° · Relevance {a.relevance} · Closing {a.closingSpeedMs} m/s · TTC {a.ttcS ?? 'N/A'} · Updated {Math.round((v.ageMs ?? 0) / 1000)} s ago</div>}
      </div>))}
  </div>);
}
