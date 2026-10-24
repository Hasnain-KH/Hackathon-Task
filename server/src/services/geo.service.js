const EARTH_RADIUS_METERS = 6371008.8;
const configuredAccuracy = Number(process.env.CAMERA_MAX_ACCURACY);
const MAX_ACCURACY_METERS = Number.isFinite(configuredAccuracy)
  ? Math.min(100, Math.max(0, configuredAccuracy))
  : 100;

export function haversineMeters(lat1, lng1, lat2, lng2) {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(lat2 - lat1);
  const longitudeDelta = radians(lng2 - lng1);
  const rawA = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(longitudeDelta / 2) ** 2;
  const a = Math.min(1, Math.max(0, rawA));
  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function verifyOffice({ lat, lng, accuracy } = {}, settings = {}) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(accuracy)) {
    return { ok: false, distanceMeters: null, reason: 'Valid location coordinates and accuracy are required.' };
  }
  if (accuracy > MAX_ACCURACY_METERS) {
    return { ok: false, distanceMeters: null, reason: `GPS accuracy is ${Math.round(accuracy)} m; maximum is ${MAX_ACCURACY_METERS} m.` };
  }
  if (!Number.isFinite(settings.officeLat) || !Number.isFinite(settings.officeLng)) {
    return { ok: false, distanceMeters: null, reason: 'Office location not configured' };
  }
  const distanceMeters = haversineMeters(lat, lng, settings.officeLat, settings.officeLng);
  const radius = Number(settings.officeRadiusMeters) || 150;
  if (distanceMeters > radius) {
    return { ok: false, distanceMeters, reason: `You are ${Math.round(distanceMeters)} m from the office; allowed radius is ${radius} m.` };
  }
  return { ok: true, distanceMeters };
}
