import LocationUpdate from '../models/LocationUpdate';
import User from '../models/User';

export interface IWorkingHoursConfig {
  startTime: string; // "09:00"
  endTime: string;   // "18:00"
  timezone: string;  // "Asia/Kolkata"
}

/**
 * Verifies if current time is within employee working hours in specified timezone
 */
export const isWithinWorkingHours = (workingHours?: IWorkingHoursConfig): boolean => {
  if (!workingHours) return true;

  try {
    const tz = workingHours.timezone || 'Asia/Kolkata';
    const now = new Date();

    // Format current time in employee's timezone as HH:MM
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const timeString = formatter.format(now); // e.g. "14:30"
    const [currH, currM] = timeString.split(':').map(Number);
    const currMins = currH * 60 + currM;

    const [startH, startM] = (workingHours.startTime || '09:00').split(':').map(Number);
    const startMins = startH * 60 + startM;

    const [endH, endM] = (workingHours.endTime || '18:00').split(':').map(Number);
    const endMins = endH * 60 + endM;

    if (startMins <= endMins) {
      return currMins >= startMins && currMins <= endMins;
    } else {
      // Overnight shift
      return currMins >= startMins || currMins <= endMins;
    }
  } catch (err) {
    return true; // Fallback to allow if timezone calculation fails
  }
};

/**
 * Records a location update for an employee if logged in and within working hours
 */
export const recordLocationUpdate = async (
  employeeId: string,
  latitude: number,
  longitude: number,
  accuracy?: number
) => {
  const user = await User.findOne({ employeeId });
  if (!user) {
    throw new Error(`Employee ${employeeId} not found.`);
  }

  // Enforce Section 16 & Rule 10: Location updates active ONLY during working hours
  if (!isWithinWorkingHours(user.workingHours)) {
    throw new Error('Location tracking is inactive outside working hours.');
  }

  const update = new LocationUpdate({
    employeeId,
    latitude,
    longitude,
    accuracy: accuracy || 0,
    timestamp: new Date(),
    workingStatus: user.workStatus,
  });

  await update.save();
  return update;
};

/**
 * Get latest location update for all active service agents
 */
export const getLiveAgentLocations = async () => {
  const serviceAgents = await User.find({
    role: 'Customer-Service-Agent',
    employmentStatus: 'ACTIVE',
  }).select('employeeId name phone workStatus workingHours');

  const liveData = [];

  for (const agent of serviceAgents) {
    const isWorking = isWithinWorkingHours(agent.workingHours);

    const latestLoc = await LocationUpdate.findOne({ employeeId: agent.employeeId }).sort({
      timestamp: -1,
    });

    liveData.push({
      employeeId: agent.employeeId,
      name: agent.name,
      phone: agent.phone,
      workStatus: agent.workStatus,
      isWithinWorkingHours: isWorking,
      latitude: latestLoc ? latestLoc.latitude : null,
      longitude: latestLoc ? latestLoc.longitude : null,
      lastUpdated: latestLoc ? latestLoc.timestamp : null,
    });
  }

  return liveData;
};
