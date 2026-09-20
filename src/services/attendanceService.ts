import { 
  AttendanceRecord, 
  AttendanceScanPayload, 
  AttendanceScanResult, 
  AppSettings, 
  DailySummary,
  ResponseCode,
  AttendanceAction,
  AttendanceLocationData,
  OfficeLocation
} from '../types';
import { findEmployeeById, getInitialAttendanceRecords } from '../data/mockEmployees';
import { evaluateGeofence, formatDistance } from '../utils/geolocation';

const CLIENT_ID_STORAGE_KEY = 'attendance_scanner_client_id';
const SETTINGS_STORAGE_KEY = 'attendance_app_settings';
const RECORDS_STORAGE_KEY = 'attendance_records_history';
const PROCESSED_REQUESTS_KEY = 'attendance_processed_requests';

export const DEFAULT_OFFICE_LOCATION: OfficeLocation = {
  name: 'Headquarters Office',
  nameKhmer: 'ការិយាល័យកណ្តាល',
  latitude: 11.5564, // Phnom Penh Default
  longitude: 104.9282,
  radiusMeters: 100 // 100 meters
};

/**
 * Returns or generates a persistent unique Client ID for this scanner device.
 */
export function getOrCreateClientId(): string {
  let clientId = localStorage.getItem(CLIENT_ID_STORAGE_KEY);
  if (!clientId) {
    clientId = `scanner-${crypto.randomUUID().slice(0, 8)}`;
    localStorage.setItem(CLIENT_ID_STORAGE_KEY, clientId);
  }
  return clientId;
}

/**
 * Regenerates the scanner Client ID.
 */
export function regenerateClientId(): string {
  const newId = `scanner-${crypto.randomUUID().slice(0, 8)}`;
  localStorage.setItem(CLIENT_ID_STORAGE_KEY, newId);
  return newId;
}

/**
 * Loads configured settings, merging environment variables with localStorage.
 */
export function getAppSettings(): AppSettings {
  const envUrl = (import.meta.env.VITE_APPS_SCRIPT_URL as string | undefined) || '';
  const envApiKey = (import.meta.env.VITE_ATTENDANCE_API_KEY as string | undefined) || '';

  const savedRaw = localStorage.getItem(SETTINGS_STORAGE_KEY);
  let saved: Partial<AppSettings> = {};
  if (savedRaw) {
    try {
      saved = JSON.parse(savedRaw);
    } catch {
      // Ignore parse error
    }
  }

  const clientId = getOrCreateClientId();

  return {
    appsScriptUrl: saved.appsScriptUrl !== undefined ? saved.appsScriptUrl : envUrl,
    attendanceApiKey: saved.attendanceApiKey !== undefined ? saved.attendanceApiKey : envApiKey,
    clientId,
    soundEnabled: saved.soundEnabled ?? true,
    cooldownSeconds: saved.cooldownSeconds ?? 3,
    mockMode: saved.mockMode ?? (saved.appsScriptUrl ? false : !envUrl),
    geofenceEnabled: saved.geofenceEnabled ?? true,
    officeLocation: saved.officeLocation || DEFAULT_OFFICE_LOCATION,
    stationCode: saved.stationCode || 'HQ_MAIN'
  };
}

/**
 * Saves settings to localStorage.
 */
export function saveAppSettings(newSettings: Partial<AppSettings>): AppSettings {
  const current = getAppSettings();
  const updated: AppSettings = {
    ...current,
    ...newSettings
  };
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

/**
 * Retrieves all attendance records from localStorage, seeding initial data if empty.
 */
export function getAttendanceRecords(): AttendanceRecord[] {
  const raw = localStorage.getItem(RECORDS_STORAGE_KEY);
  if (!raw) {
    const initial = getInitialAttendanceRecords();
    localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  try {
    const parsed: AttendanceRecord[] = JSON.parse(raw);
    const uniqueDays = new Set(parsed.map(r => r.date));
    if (uniqueDays.size <= 7) {
      const initial = getInitialAttendanceRecords();
      const existingIds = new Set(parsed.map(r => r.id));
      const todayStr = new Date().toISOString().split('T')[0];
      const pastDaysRecords = initial.filter(r => r.date !== todayStr && !existingIds.has(r.id));
      const combined = [...pastDaysRecords, ...parsed];
      localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(combined));
      return combined;
    }
    return parsed;
  } catch {
    return getInitialAttendanceRecords();
  }
}

/**
 * Saves records to localStorage.
 */
export function saveAttendanceRecords(records: AttendanceRecord[]): void {
  localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(records));
}

/**
 * Clears attendance records from localStorage.
 */
export function clearAttendanceRecords(): void {
  localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify([]));
}

// In-memory timestamps for rapid rate limiting and per-employee cooldown
const recentEmployeeScans = new Map<string, number>();
const recentDeviceScanTimes: number[] = [];

/**
 * Submits an attendance scan either to Google Apps Script or simulated engine.
 */
export async function submitAttendanceScan(params: {
  employeeId: string;
  fullName?: string;
  action?: AttendanceAction;
  location?: AttendanceLocationData;
  bypassGeofence?: boolean;
}): Promise<AttendanceScanResult> {
  const settings = getAppSettings();
  const requestId = crypto.randomUUID();
  const clientId = settings.clientId || getOrCreateClientId();
  const now = new Date();
  const nowMs = now.getTime();
  const today = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0]; // HH:mm:ss

  // 1. Resolve employee details
  const employee = findEmployeeById(params.employeeId);
  if (!employee) {
    return {
      success: false,
      code: 'EMPLOYEE_NOT_FOUND',
      message: `រកមិនឃើញបុគ្គលិកលេខសម្គាល់ ${params.employeeId} ក្នុងប្រព័ន្ធឡើយ (Employee not found / deleted).`,
      requestId,
      employeeId: params.employeeId.trim().toUpperCase(),
      fullName: params.fullName || params.employeeId,
      department: 'N/A',
      timestamp: now.toISOString()
    };
  }

  if (employee.status === 'resigned') {
    return {
      success: false,
      code: 'UNAUTHORIZED',
      message: `បុគ្គលិក ${employee.fullNameKhmer || employee.fullName} (${employee.id}) បានឈប់ធ្វើការហើយ មិនអាចស្កេនវត្តមានបានឡើយ (Employee has resigned).`,
      requestId,
      employeeId: employee.id,
      fullName: employee.fullName,
      department: employee.department,
      timestamp: now.toISOString()
    };
  }

  const resolvedEmpId = employee.id;
  const resolvedFullName = params.fullName || employee.fullName;
  const resolvedDept = employee.department;

  // 2. Geofence verification guard
  let locationData: AttendanceLocationData | undefined = params.location;
  if (settings.geofenceEnabled && !params.bypassGeofence && params.location) {
    const geofence = evaluateGeofence(
      params.location.latitude,
      params.location.longitude,
      settings.officeLocation.latitude,
      settings.officeLocation.longitude,
      settings.officeLocation.radiusMeters,
      params.location.accuracy
    );

    locationData = {
      ...params.location,
      distanceMeters: geofence.distanceMeters,
      inGeofence: geofence.inGeofence
    };

    if (!geofence.inGeofence) {
      return {
        success: false,
        code: 'GEOFENCE_VIOLATION',
        message: `ក្រៅតំបន់ការិយាល័យ! អ្នកនៅចម្ងាយ ${formatDistance(geofence.distanceMeters)} ពីការិយាល័យ (អនុញ្ញាតត្រឹម ${settings.officeLocation.radiusMeters} ម៉ែត្រ)។`,
        messageKhmer: `ក្រៅតំបន់ការិយាល័យ! អ្នកនៅចម្ងាយ ${formatDistance(geofence.distanceMeters)} ពីការិយាល័យ (អនុញ្ញាតត្រឹម ${settings.officeLocation.radiusMeters} ម៉ែត្រ)។`,
        requestId,
        employeeId: resolvedEmpId,
        fullName: resolvedFullName,
        department: resolvedDept,
        timestamp: now.toISOString(),
        location: locationData
      };
    }
  }

  // 3. Client-side state guard: Rate limit check (e.g. max 6 scans in 3 seconds across terminal)
  while (recentDeviceScanTimes.length > 0 && nowMs - recentDeviceScanTimes[0] > 3000) {
    recentDeviceScanTimes.shift();
  }
  if (recentDeviceScanTimes.length >= 6) {
    return {
      success: false,
      code: 'RATE_LIMITED',
      message: 'Scanner terminal is rate limited. Please slow down.',
      requestId,
      employeeId: resolvedEmpId,
      fullName: resolvedFullName,
      department: resolvedDept,
      timestamp: now.toISOString()
    };
  }
  recentDeviceScanTimes.push(nowMs);

  // 3. Client-side cooldown guard (per employee)
  const lastEmployeeScan = recentEmployeeScans.get(resolvedEmpId);
  const cooldownMs = (settings.cooldownSeconds || 5) * 1000;
  if (lastEmployeeScan && nowMs - lastEmployeeScan < cooldownMs) {
    const remainingSecs = Math.ceil((cooldownMs - (nowMs - lastEmployeeScan)) / 1000);
    return {
      success: false,
      code: 'SCAN_COOLDOWN',
      message: `Employee ${resolvedEmpId} was just scanned. Please wait ${remainingSecs}s before scanning again.`,
      requestId,
      employeeId: resolvedEmpId,
      fullName: resolvedFullName,
      department: resolvedDept,
      timestamp: now.toISOString()
    };
  }

  // 4. Replay protection check
  const processedRequestsRaw = localStorage.getItem(PROCESSED_REQUESTS_KEY);
  let processedRequests: string[] = [];
  if (processedRequestsRaw) {
    try {
      processedRequests = JSON.parse(processedRequestsRaw);
    } catch {
      processedRequests = [];
    }
  }
  if (processedRequests.includes(requestId)) {
    return {
      success: false,
      code: 'REPLAY_DETECTED',
      message: 'Duplicate request detected (replay protection triggered).',
      requestId,
      employeeId: resolvedEmpId,
      fullName: resolvedFullName,
      department: resolvedDept,
      timestamp: now.toISOString()
    };
  }

  // Determine intended action based on today's records for this employee
  const currentRecords = getAttendanceRecords();
  const todayEmployeeRecords = currentRecords.filter(
    r => r.employeeId === resolvedEmpId && r.date === today && r.status === 'success'
  );

  let determinedAction: AttendanceAction = params.action || 'check_in';
  if (!params.action) {
    const hasCheckIn = todayEmployeeRecords.some(r => r.type === 'check_in');
    const hasCheckOut = todayEmployeeRecords.some(r => r.type === 'check_out');

    if (hasCheckIn && hasCheckOut) {
      return {
        success: false,
        code: 'ATTENDANCE_COMPLETED',
        message: `${resolvedFullName} has already checked in and out for today.`,
        requestId,
        employeeId: resolvedEmpId,
        fullName: resolvedFullName,
        department: resolvedDept,
        timestamp: now.toISOString()
      };
    } else if (hasCheckIn && !hasCheckOut) {
      determinedAction = 'check_out';
    } else {
      determinedAction = 'check_in';
    }
  }

  // Construct standard payload
  const payload: AttendanceScanPayload = {
    apiKey: settings.attendanceApiKey,
    clientId,
    requestId,
    employeeId: resolvedEmpId,
    fullName: resolvedFullName,
    action: determinedAction,
    timestamp: now.toISOString(),
    location: locationData
  };

  // 5. Check if real Google Apps Script URL is provided and not in Mock Mode
  const shouldUseCloud = !!settings.appsScriptUrl && !settings.mockMode;

  if (shouldUseCloud) {
    try {
      // Crucial requirement: Content-Type must be 'text/plain;charset=utf-8' to avoid CORS preflight in Google Apps Script!
      const response = await fetch(settings.appsScriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload),
        redirect: 'follow'
      });

      const responseText = await response.text();
      let resultData: Record<string, unknown> = {};

      try {
        resultData = JSON.parse(responseText);
      } catch {
        // If response is plain text or HTML error from Google
        if (response.ok) {
          resultData = { status: 'success', code: determinedAction, message: responseText };
        } else {
          throw new Error(responseText || `HTTP error ${response.status}`);
        }
      }

      // Check Google Apps Script returned status or error codes
      const resStatus = resultData.status || (response.ok ? 'success' : 'error');
      const resCode = (resultData.code as ResponseCode) || (resStatus === 'success' ? determinedAction : 'SERVER_ERROR');
      const resMessage = (resultData.message as string) || (resStatus === 'success' ? 'Recorded successfully' : 'Error from Google Apps Script');

      // Check known error codes from script
      if (resCode === 'SCAN_COOLDOWN' || resCode === 'ATTENDANCE_COMPLETED' || resCode === 'RATE_LIMITED' || resCode === 'REPLAY_DETECTED' || resCode === 'UNAUTHORIZED') {
        return {
          success: false,
          code: resCode,
          message: resMessage,
          requestId,
          employeeId: resolvedEmpId,
          fullName: resolvedFullName,
          department: resolvedDept,
          timestamp: now.toISOString(),
          location: locationData
        };
      }

      // Successful cloud response
      recentEmployeeScans.set(resolvedEmpId, nowMs);
      saveProcessedRequest(requestId, processedRequests);

      const record: AttendanceRecord = {
        id: (resultData.recordId as string) || `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        requestId,
        clientId,
        employeeId: resolvedEmpId,
        fullName: resolvedFullName,
        department: resolvedDept,
        type: determinedAction,
        timestamp: now.toISOString(),
        date: today,
        time: timeStr,
        status: 'success',
        code: resCode,
        message: resMessage,
        syncedToGoogleSheet: true,
        location: locationData
      };

      currentRecords.unshift(record);
      saveAttendanceRecords(currentRecords);

      return {
        success: true,
        action: determinedAction,
        code: resCode,
        message: determinedAction === 'check_in' ? 'Check-in recorded successfully to Google Sheet!' : 'Check-out recorded successfully to Google Sheet!',
        requestId,
        employeeId: resolvedEmpId,
        fullName: resolvedFullName,
        department: resolvedDept,
        timestamp: now.toISOString(),
        record,
        location: locationData
      };

    } catch (err: unknown) {
      console.warn('Google Apps Script request failed, falling back to local recording:', err);
      // Fallback: If network or script error occurs, record locally with unsynced status
      recentEmployeeScans.set(resolvedEmpId, nowMs);
      saveProcessedRequest(requestId, processedRequests);

      const record: AttendanceRecord = {
        id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        requestId,
        clientId,
        employeeId: resolvedEmpId,
        fullName: resolvedFullName,
        department: resolvedDept,
        type: determinedAction,
        timestamp: now.toISOString(),
        date: today,
        time: timeStr,
        status: 'success',
        code: determinedAction,
        message: 'Recorded locally (Google Apps Script sync offline or unreachable)',
        syncedToGoogleSheet: false,
        location: locationData
      };

      currentRecords.unshift(record);
      saveAttendanceRecords(currentRecords);

      return {
        success: true,
        action: determinedAction,
        code: determinedAction,
        message: determinedAction === 'check_in' 
          ? 'Check-In recorded locally (Cloud offline)' 
          : 'Check-Out recorded locally (Cloud offline)',
        requestId,
        employeeId: resolvedEmpId,
        fullName: resolvedFullName,
        department: resolvedDept,
        timestamp: now.toISOString(),
        record,
        location: locationData
      };
    }
  }

  // 6. Local / Mock Engine Execution
  recentEmployeeScans.set(resolvedEmpId, nowMs);
  saveProcessedRequest(requestId, processedRequests);

  const localRecord: AttendanceRecord = {
    id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    requestId,
    clientId,
    employeeId: resolvedEmpId,
    fullName: resolvedFullName,
    department: resolvedDept,
    type: determinedAction,
    timestamp: now.toISOString(),
    date: today,
    time: timeStr,
    status: 'success',
    code: determinedAction,
    message: 'Recorded locally (Mock Mode)',
    syncedToGoogleSheet: false,
    location: locationData
  };

  currentRecords.unshift(localRecord);
  saveAttendanceRecords(currentRecords);

  return {
    success: true,
    action: determinedAction,
    code: determinedAction,
    message: determinedAction === 'check_in' ? 'Check-In recorded successfully!' : 'Check-Out recorded successfully!',
    requestId,
    employeeId: resolvedEmpId,
    fullName: resolvedFullName,
    department: resolvedDept,
    timestamp: now.toISOString(),
    record: localRecord,
    location: locationData
  };
}

function saveProcessedRequest(requestId: string, list: string[]): void {
  list.push(requestId);
  // Keep last 100 request IDs to avoid memory leak
  if (list.length > 100) {
    list = list.slice(-100);
  }
  localStorage.setItem(PROCESSED_REQUESTS_KEY, JSON.stringify(list));
}

/**
 * Calculates current day's summary statistics.
 */
export function calculateDailySummary(records: AttendanceRecord[], totalStaffCount: number): DailySummary {
  const today = new Date().toISOString().split('T')[0];
  const todayRecords = records.filter(r => r.date === today && r.status === 'success');

  // Set of employee IDs that had any activity today
  const presentEmployees = new Set(todayRecords.map(r => r.employeeId));

  // Determine current status per employee
  // Map of employeeId -> last action ('check_in' | 'check_out')
  const lastActionMap = new Map<string, AttendanceAction>();

  // Sort chronologically ascending to find the last action
  const sorted = [...todayRecords].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  sorted.forEach(r => {
    lastActionMap.set(r.employeeId, r.type);
  });

  let currentlyIn = 0;
  let checkedOut = 0;

  lastActionMap.forEach(action => {
    if (action === 'check_in') {
      currentlyIn++;
    } else if (action === 'check_out') {
      checkedOut++;
    }
  });

  const presentToday = presentEmployees.size;
  const attendanceRate = totalStaffCount > 0 ? Math.round((presentToday / totalStaffCount) * 100) : 0;

  return {
    totalEmployees: totalStaffCount,
    presentToday,
    checkedInNow: currentlyIn,
    checkedOutToday: checkedOut,
    attendanceRate
  };
}

/**
 * Tests connection to Google Apps Script endpoint.
 */
export async function testAppsScriptConnection(url: string, apiKey: string): Promise<{ success: boolean; message: string; data?: any }> {
  const cleanUrl = (url || '').trim();
  if (!cleanUrl) {
    return { success: false, message: 'Google Apps Script URL is empty.' };
  }

  // Verify that it ends with /exec
  if (!cleanUrl.includes('/exec')) {
    return { 
      success: false, 
      message: 'Invalid URL format! Make sure the URL ends with "/exec" (from Web App deployment), not "/edit".' 
    };
  }

  try {
    const testPayload = {
      action: 'ping',
      apiKey: apiKey || '',
      clientId: getOrCreateClientId(),
      requestId: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'req-' + Date.now(),
      timestamp: new Date().toISOString()
    };

    // Try POST with text/plain (GAS compliant)
    const res = await fetch(cleanUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(testPayload),
      redirect: 'follow'
    });

    const text = await res.text();
    let json: any = {};
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }

    if (res.ok) {
      return { 
        success: true, 
        message: json.message || 'Connected to Google Apps Script successfully!',
        data: json 
      };
    } else {
      return { 
        success: false, 
        message: `HTTP Error ${res.status}: ${text || res.statusText}` 
      };
    }
  } catch (err: any) {
    // If POST failed due to CORS or redirect, try a GET ping as fallback
    try {
      const getRes = await fetch(`${cleanUrl}?action=ping&apiKey=${encodeURIComponent(apiKey || '')}`, {
        method: 'GET',
        redirect: 'follow'
      });
      const getText = await getRes.text();
      let getJson: any = {};
      try {
        getJson = JSON.parse(getText);
      } catch {
        getJson = { raw: getText };
      }

      if (getRes.ok) {
        return {
          success: true,
          message: getJson.message || 'Connected to Google Apps Script successfully via GET!',
          data: getJson
        };
      }
    } catch {
      // Fall through to descriptive error below
    }

    return { 
      success: false, 
      message: 'Failed to fetch: Google Apps Script permission issue. Please ensure "Who has access" is set to "Anyone" when deploying Web App.' 
    };
  }
}
