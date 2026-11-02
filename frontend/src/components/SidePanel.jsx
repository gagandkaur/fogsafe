import { useEffect } from 'react';

const VIS = [20, 40, 60, 100, 200];
const LABEL = { ahead: 'Ahead', behind: 'Behind', left: 'Left', right: 'Right' };
const cap = (s) => s.charAt(0) + s.slice(1).toLowerCase();

export function ConnectionStatus({ status }) {
  const text = { connected: 'Connected', reconnecting: 'Reconnecting', offline: 'Offline' }[status];
  return (
    <span className="conn">
      <i className={`sq ${status}`} />
      {text}
    </span>
  );
}

export function AlertBanner({ nearest, demoMsg, notice }) {
  const a = nearest?.analysis;
  const danger = a && (a.risk === 'RED' || a.risk === 'CRITICAL') ? a.risk : null;
  // Haptic warning when the risk level escalates (ignored on devices without vibration support).
  useEffect(() => {
    if (danger) navigator.vibrate?.(danger === 'CRITICAL' ? [300, 100, 300, 100, 300] : [200]);
  }, [danger]);

  if (danger)
    return (
      <div role="alert" aria-live="assertive" className={`banner ${a.risk}`}>
        {a.risk === 'CRITICAL' ? 'Brake.' : 'Collision risk.'} {a.distanceM} m {LABEL[a.direction].toLowerCase()}.
        {a.ttcS != null ? ` ${a.ttcS} s.` : ''}
      </div>
    );
  if (notice)
    return (
      <div role="status" aria-live="polite" className="banner warn">
        {notice}
      </div>
    );
  return demoMsg ? (
    <div role="status" className="banner demo">
      {demoMsg}
    </div>
  ) : null;
}

export function StatusCard({ nearest, visibilityM, fogOn }) {
  const a = nearest?.analysis;
  return (
    <div className="card">
      <div className="lbl">Nearest vehicle · visibility {visibilityM} m</div>
      {!fogOn ? (
        <div>Fog mode off.</div>
      ) : a ? (
        <div className={`status ${a.risk}`}>
          <div className="big">
            {a.distanceM} m {LABEL[a.direction].toLowerCase()}
          </div>
          {a.visual === 'BEYOND_VISUAL_RANGE' && <div className="small">Beyond visual range.</div>}
          <div>
            Risk: {cap(a.risk)}. Time to collision: {a.ttcS == null ? 'N/A' : `${a.ttcS} s`}.
          </div>
          {nearest.ml?.early && nearest.ml.predictedLevel >= 2 && (
            <div className="small" role="status">
              Early warning: {cap(nearest.ml.predicted)} expected within 3 s.
            </div>
          )}
          {a.lowConfidence && <div className="small">Low GPS confidence.</div>}
        </div>
      ) : (
        <div>No vehicles nearby.</div>
      )}
    </div>
  );
}

export function ModeSwitch({ mode, setMode }) {
  return (
    <div className="card">
      <div className="seg">
        <button className={mode === 'sim' ? 'on' : ''} onClick={() => setMode('sim')}>
          Simulation
        </button>
        <button className={mode === 'real' ? 'on' : ''} onClick={() => setMode('real')}>
          Real phones
        </button>
      </div>
    </div>
  );
}

export function FogControls({ fogOn, setFogOn, visibilityM, setVisibilityM }) {
  return (
    <div className="card">
      <div className="lbl">Fog</div>
      <label className="chk">
        <input type="checkbox" checked={fogOn} onChange={(e) => setFogOn(e.target.checked)} />
        Fog mode
      </label>
      <div className="small">Visibility</div>
      <div className="seg">
        {VIS.map((v) => (
          <button key={v} className={v === visibilityM ? 'on' : ''} onClick={() => setVisibilityM(v)}>
            {v} m
          </button>
        ))}
      </div>
    </div>
  );
}

export function SimControls({ sim, onDemo, demoOn }) {
  return (
    <div className="card">
      <div className="lbl">Simulation</div>
      <div className="row">
        <button className={demoOn ? 'on' : ''} onClick={onDemo}>
          {demoOn ? 'Stop demo' : 'Start demo'}
        </button>
        <button onClick={() => sim.setRunning(!sim.running)}>{sim.running ? 'Pause' : 'Run'}</button>
        <button onClick={sim.clear}>Clear</button>
      </div>
      <div className="small" style={{ marginTop: 12 }}>
        Add vehicle
      </div>
      <div className="row">
        <button onClick={() => sim.addVehicle(180, 42)}>180 m at 42</button>
        <button onClick={() => sim.addVehicle(120, 10)}>120 m at 10</button>
        <button onClick={() => sim.addVehicle(-80, 60)}>80 m behind</button>
        <button onClick={() => sim.addVehicle(60, 40, 40, 270)}>Crossing</button>
      </div>
    </div>
  );
}

export function RealControls({ rt, gpsNote }) {
  return (
    <div className="card">
      <div className="lbl">Real phones</div>
      {rt.joined ? (
        <div>
          You are <b>{rt.vehicleId ?? '…'}</b>
        </div>
      ) : (
        <div>Not joined.</div>
      )}
      {!rt.joined ? (
        <>
          <div className="small">
            Location is used only to show you to nearby FogSafe vehicles. Temporary ID, no personal data.
          </div>
          <div className="row">
            <button className="on" onClick={() => rt.join(null)}>
              Join as vehicle (GPS)
            </button>
          </div>
          <div className="small" style={{ marginTop: 12 }}>
            No GPS? Test with simulated GPS (open two tabs).
          </div>
          <div className="row">
            <button onClick={() => rt.join('A')}>Test vehicle A</button>
            <button onClick={() => rt.join('B')}>Test vehicle B (180 m ahead)</button>
          </div>
        </>
      ) : (
        <div className="row">
          <button onClick={rt.leave}>Leave</button>
        </div>
      )}
      {rt.message && <div className="err">{rt.message}</div>}
      {gpsNote && <div className="err">{gpsNote}.</div>}
      {rt.joined && !rt.user && !rt.message && <div className="small">Waiting for GPS fix.</div>}
    </div>
  );
}

export function VehicleList({ items, selectedId, onSelect, onRemove }) {
  return (
    <div className="card" style={{ padding: 0 }}>
      <div className="lbl" style={{ padding: '16px 16px 0' }}>
        Vehicles ({items.length})
      </div>
      {items.length === 0 && (
        <div className="small" style={{ padding: '0 16px 16px' }}>
          No vehicles.
        </div>
      )}
      {items.length > 0 && (
        <>
          <div className="vrow head">
            <span>ID</span>
            <span>Distance</span>
            <span>Dir.</span>
            <span>Speed</span>
            <span>Risk</span>
          </div>
          {items.map(({ vehicle: v, analysis: a }) => (
            <div
              key={v.vehicleId}
              className={`vrow ${v.vehicleId === selectedId ? 'sel' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(v.vehicleId)}
              onKeyDown={(e) => e.key === 'Enter' && onSelect(v.vehicleId)}
            >
              <span className="id">
                {v.vehicleId}
                {a.visual === 'BEYOND_VISUAL_RANGE' && <span className="dig">digital</span>}
              </span>
              <span>{a.distanceM} m</span>
              <span>{LABEL[a.direction]}</span>
              <span>{Math.round(v.speedKmh)} km/h</span>
              <span className={`risk ${a.risk}`}>{cap(a.risk)}</span>
              {onRemove && (
                <button
                  className="x"
                  aria-label={`Remove ${v.vehicleId}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(v.vehicleId);
                  }}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
