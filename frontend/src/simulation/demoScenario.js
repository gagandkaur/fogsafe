// t = seconds after pressing Demo. Thresholds/colours come from the shared core, not from here.
export const DEMO = [
  {
    t: 0,
    msg: '1. Normal visibility (200 m)',
    run: (a) => {
      a.setFogOn(false);
      a.setVisibilityM(200);
    },
  },
  { t: 4, msg: '2. Fog begins', run: (a) => a.setFogOn(true) },
  { t: 7, msg: '3. Visibility decreasing…', run: (a) => a.setVisibilityM(100) },
  { t: 10, msg: '3. Visibility 60 m', run: (a) => a.setVisibilityM(60) },
  { t: 13, msg: '4. Vehicle detected 180 m ahead: beyond visual range', run: (a) => a.addVehicle(180, 42) },
  { t: 22, msg: '5. Vehicle ahead brakes: closing speed rises', run: (a) => a.brake() },
  { t: 34, msg: '6. Watch risk: Green → Yellow → Red → Critical' },
  { t: 45, msg: 'Demo finished', run: (a) => a.done() },
];
