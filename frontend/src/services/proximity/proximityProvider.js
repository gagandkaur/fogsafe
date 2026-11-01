// Optional proximity source (NOT a location source). Confirms "a FogSafe device is physically near".
export const proximityProvider = {
  supported: false,
  start(_onNearbyDevice) { /* React Native BLE implementation goes here */ },
  stop() {},
};
