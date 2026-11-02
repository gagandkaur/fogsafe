import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const VehicleSessionSchema = new Schema({
  vehicleId: { type: String, index: true },
  mode: { type: String, enum: ['real', 'sim'], default: 'real' },
  startedAt: Date,
  endedAt: Date,
});

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    passwordHash: { type: String }, // 'salt:hash' (scrypt); never sent to clients
  },
  { timestamps: true },
);

const FogSettingsSchema = new Schema(
  {
    vehicleId: { type: String, index: true, unique: true },
    visibilityM: { type: Number, default: 60 },
    fogMode: { type: Boolean, default: true },
    radiusM: { type: Number, default: 500 },
  },
  { timestamps: true },
);

// Short-lived only — TTL index auto-deletes after 24h so this never grows unbounded.
const LocationHistorySchema = new Schema({
  vehicleId: String,
  lat: Number,
  lng: Number,
  speedKmh: Number,
  heading: Number,
  ts: { type: Date, default: Date.now, expires: 60 * 60 * 24 },
});

export const User = model('User', UserSchema);
export const VehicleSession = model('VehicleSession', VehicleSessionSchema);
export const FogSettings = model('FogSettings', FogSettingsSchema);
export const LocationHistory = model('LocationHistory', LocationHistorySchema);
