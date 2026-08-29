import User, { IUser } from '../models/User';
import Complaint, { IComplaint } from '../models/Complaint';
import LocationUpdate from '../models/LocationUpdate';
import { isWithinWorkingHours } from './locationService';

// Haversine formula distance in kilometers
export const calculateDistanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth radius in KM
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Automatically assign open complaint to nearest available active agent
 */
export const autoAssignComplaint = async (complaintId: string): Promise<IComplaint> => {
  const complaint = await Complaint.findOne({ complaintId });
  if (!complaint) {
    throw new Error(`Complaint ${complaintId} not found.`);
  }

  if (complaint.status !== 'OPEN') {
    return complaint;
  }

  // 1. Find active Customer-Service Agents who are AVAILABLE
  const availableAgents = await User.find({
    role: 'Customer-Service-Agent',
    employmentStatus: 'ACTIVE',
    workStatus: 'AVAILABLE',
  });

  if (availableAgents.length === 0) {
    return complaint; // Remains OPEN until an agent becomes available
  }

  // 2. Filter agents who are currently within their working hours
  const workingAgents = availableAgents.filter((agent) =>
    isWithinWorkingHours(agent.workingHours)
  );

  const eligibleAgents = workingAgents.length > 0 ? workingAgents : availableAgents;

  let chosenAgent: IUser | null = null;
  let minDistance = Infinity;

  // 3. Find nearest agent using location updates
  for (const agent of eligibleAgents) {
    const latestLoc = await LocationUpdate.findOne({ employeeId: agent.employeeId }).sort({
      timestamp: -1,
    });

    if (latestLoc) {
      const dist = calculateDistanceKm(
        complaint.location.latitude,
        complaint.location.longitude,
        latestLoc.latitude,
        latestLoc.longitude
      );
      if (dist < minDistance) {
        minDistance = dist;
        chosenAgent = agent;
      }
    }
  }

  // Fallback to first available if no location updates exist
  if (!chosenAgent) {
    chosenAgent = eligibleAgents[0];
  }

  // 4. Assign complaint and update statuses
  complaint.assignedAgentId = chosenAgent.employeeId;
  complaint.assignedTime = new Date();
  complaint.status = 'ASSIGNED';
  await complaint.save();

  // Mark agent as BUSY
  chosenAgent.workStatus = 'BUSY';
  await chosenAgent.save();

  return complaint;
};
