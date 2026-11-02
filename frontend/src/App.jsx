import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import './styles.css';
import { analyzeVehicle, haversineM, defaultConfig, predictRisk } from '@core';
import riskModel from '../../shared/core/risk_model.json';
import { useSpeedHistory } from './hooks/useSpeedHistory.js';
import MapView from './components/MapView.jsx';
import {
  StatusCard,
  FogControls,
  SimControls,
  RealControls,
  VehicleList,
  ModeSwitch,
  AlertBanner,
  ConnectionStatus,
} from './components/SidePanel.jsx';
import { useSim } from './hooks/useSim.js';
import { useRealtime } from './hooks/useRealtime.js';
import { DEMO } from './simulation/demoScenario.js';
import AddVehiclePanel from './components/AddVehiclePanel.jsx';
import VehicleDetailModal from './components/VehicleDetailModal.jsx';
import AuthScreen from './components/AuthScreen.jsx';
import { useAuth } from './hooks/useAuth.js';

const STALE_MS = defaultConfig.staleAfterMs;

export default function App() {
  const auth = useAuth();
  if (auth.checking) return <div className="authwrap small">Checking your session…</div>;
  if (!auth.user) return <AuthScreen auth={auth} />;
  return <Dashboard auth={auth} />;
}

function Dashboard({ auth }) {
  const [mode, setModeRaw] = useState('sim');
  const [visibilityM, setVisibilityM] = useState(60);
  const [fogOn, setFogOn] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [demoMsg, setDemoMsg] = useState(null);
  const [now, setNow] = useState(Date.now());
  const timers = useRef([]);
  const sim = useSim(mode === 'sim'),
    rt = useRealtime(auth.token, auth.expire);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const stopDemo = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setDemoMsg(null);
  };
  const setMode = (m) => {
    stopDemo();
    if (m === 'sim') rt.leave();
    setModeRaw(m);
  };
  const runDemo = () => {
    if (timers.current.length) return stopDemo();
    setModeRaw('sim');
    rt.leave();
    sim.reset();
    const api = {
      setFogOn,
      setVisibilityM,
      addVehicle: sim.addVehicle,
      brake: sim.brake,
      done: () => {
        timers.current = [];
        setDemoMsg(null);
      },
    };
    DEMO.forEach((s) =>
      timers.current.push(
        setTimeout(() => {
          setDemoMsg(s.msg);
          s.run?.(api);
        }, s.t * 1000),
      ),
    );
  };

  const user = mode === 'sim' ? sim.user : rt.user;
  const live = mode === 'real' && rt.status === 'connected';
  const raw =
    mode === 'sim'
      ? sim.vehicles
      : live
        ? rt.neighbors.list
            .map((v) => ({ ...v, ageMs: v.ageMs + now - rt.neighbors.at }))
            .filter((v) => v.ageMs <= STALE_MS)
        : [];
  const prevSpeed = useSpeedHistory(raw);
  const items = !user
    ? []
    : raw
        .filter((v) => haversineM(user.lat, user.lng, v.lat, v.lng) <= defaultConfig.nearbyRadiusM)
        .map((v) => ({
          vehicle: v,
          analysis: analyzeVehicle(user, v, visibilityM),
          ml: predictRisk(riskModel, user, v, visibilityM, prevSpeed(v.vehicleId, v.speedKmh)),
        }))
        .sort((a, b) => a.analysis.distanceM - b.analysis.distanceM);

  // Never present stale data as live.
  let notice = null;
  if (mode === 'real' && rt.joined && !live)
    notice = `Connection lost${rt.neighbors.at ? ` · last update ${Math.round((now - rt.neighbors.at) / 1000)} s ago` : ''}. Vehicle data hidden.`;
  else if (mode === 'real' && user?.accuracyM > 50)
    notice = `Low GPS accuracy (±${Math.round(user.accuracyM)} m). Warnings may be unreliable.`;
  const gpsNote =
    mode === 'real' && user?.accuracyM > 50 ? `Low GPS accuracy (±${Math.round(user.accuracyM)} m)` : null;

  return (
    <div className="app">
      <div className="mapwrap">
        {user ? (
          <MapView
            user={user}
            items={items}
            visibilityM={visibilityM}
            fogOn={fogOn}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        ) : (
          <div className="map empty">Join as a vehicle to start (waiting for GPS location)</div>
        )}
        <AlertBanner nearest={items[0]} demoMsg={demoMsg} notice={notice} />
      </div>
      <div className="panel">
        <div className="header">
          <span>FogSafe</span>
          {mode === 'real' && <ConnectionStatus status={rt.status} />}
          <span className="who">
            {auth.user.name}
            <button
              onClick={() => {
                stopDemo();
                rt.leave();
                auth.logout();
              }}
            >
              Log out
            </button>
          </span>
        </div>
        <ModeSwitch mode={mode} setMode={setMode} />
        <StatusCard nearest={items[0]} visibilityM={visibilityM} fogOn={fogOn} />
        <FogControls {...{ fogOn, setFogOn, visibilityM, setVisibilityM }} />
        {mode === 'sim' ? (
          <SimControls sim={sim} onDemo={runDemo} demoOn={!!demoMsg} />
        ) : (
          <RealControls rt={rt} gpsNote={gpsNote} />
        )}
        {mode === 'sim' && <AddVehiclePanel onAdd={sim.addVehicle} />}
        <VehicleList
          items={items}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onRemove={mode === 'sim' ? sim.remove : null}
        />
        <VehicleDetailModal
          item={items.find((i) => i.vehicle.vehicleId === selectedId)}
          onClose={() => setSelectedId(null)}
        />
        <div className="foot">
          Prototype · demo thresholds, not road-safety standards · relevance is a geometric approximation, not lane
          detection
        </div>
      </div>
    </div>
  );
}
