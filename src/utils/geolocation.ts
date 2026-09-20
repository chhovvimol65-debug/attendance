/**
 * Geolocation & Geofencing utility functions.
 * Computes distance via Haversine formula and checks office boundary conformance.
 */

export const STATION_QR_PREFIX = 'ATTENDANCE_STATION:';

/**
 * Generates the Station QR Payload.
 */
export function getStationQrValue(stationCode: string = 'HQ_MAIN'): string {
  return `${STATION_QR_PREFIX}${stationCode || 'HQ_MAIN'}`;
}

/**
 * Checks if a scanned raw string is the company station QR code.
 */
export function isStationQrCode(rawCode: string): boolean {
  if (!rawCode) return false;
  const trimmed = rawCode.trim();
  return trimmed.startsWith(STATION_QR_PREFIX) || trimmed === 'ATTENDANCE_STATION_HQ';
}

/**
 * Calculates the great-circle distance between two GPS coordinates using the Haversine formula.
 * Returns distance in meters.
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export interface GeofenceCheckResult {
  inGeofence: boolean;
  distanceMeters: number;
  allowedRadiusMeters: number;
  userLatitude: number;
  userLongitude: number;
  officeLatitude: number;
  officeLongitude: number;
  accuracyMeters?: number;
}

/**
 * Checks if the user is within the office geofence.
 */
export function evaluateGeofence(
  userLat: number,
  userLon: number,
  officeLat: number,
  officeLon: number,
  radiusMeters: number,
  accuracy?: number
): GeofenceCheckResult {
  const distance = calculateDistanceMeters(userLat, userLon, officeLat, officeLon);
  return {
    inGeofence: distance <= radiusMeters,
    distanceMeters: distance,
    allowedRadiusMeters: radiusMeters,
    userLatitude: userLat,
    userLongitude: userLon,
    officeLatitude: officeLat,
    officeLongitude: officeLon,
    accuracyMeters: accuracy
  };
}

/**
 * Prompts the browser for current GPS position with high accuracy.
 */
export function getCurrentPosition(options?: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser/device.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      resolve,
      reject,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
        ...options
      }
    );
  });
}

/**
 * Formats distance in meters or kilometers nicely.
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters}m`;
  }
  return `${(meters / 1000).toFixed(2)}km`;
}
