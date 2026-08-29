import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { LiveLocationAgent } from '../../types';
import { MapPin, RefreshCw, Radio } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Fix default Leaflet icon paths
const customAgentIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export const LiveAgentMap: React.FC = () => {
  const [agents, setAgents] = useState<LiveLocationAgent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/locations/live');
      if (res.data.success) {
        setAgents(res.data.data);
        setLastRefreshed(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch live agent locations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
    const interval = setInterval(fetchLocations, 15000); // 15s auto sync
    return () => clearInterval(interval);
  }, []);

  const mapCenter: [number, number] = [13.0827, 80.2707]; // Chennai default center

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <MapPin className="w-6 h-6 text-emerald-400 animate-pulse" />
            Live Field Service Agent Location Tracker
          </h2>
          <p className="text-xs text-slate-400">
            Real-time GPS tracking active strictly during employee working hours (Section 15 & Rule 10)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-ping" />
            Updated: {lastRefreshed.toLocaleTimeString()}
          </span>

          <button
            onClick={fetchLocations}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync GPS</span>
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div className="glass-panel rounded-2xl p-2 overflow-hidden border border-slate-800 relative">
        <div className="h-[520px] w-full rounded-xl overflow-hidden z-10">
          <MapContainer center={mapCenter} zoom={12} scrollWheelZoom={true} className="h-full w-full">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {agents.map((agent) => {
              if (agent.latitude && agent.longitude) {
                return (
                  <Marker
                    key={agent.employeeId}
                    position={[agent.latitude, agent.longitude]}
                    icon={customAgentIcon}
                  >
                    <Popup>
                      <div className="p-2 space-y-1.5 font-sans">
                        <p className="font-bold text-slate-900 text-sm">{agent.name}</p>
                        <p className="text-xs text-slate-600 font-mono">ID: {agent.employeeId}</p>
                        <div className="flex items-center gap-2 pt-1">
                          <span
                            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                              agent.workStatus === 'AVAILABLE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {agent.workStatus}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {agent.lastUpdated ? new Date(agent.lastUpdated).toLocaleTimeString() : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              }
              return null;
            })}
          </MapContainer>
        </div>
      </div>

      {/* Agents Status Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((ag) => (
          <div key={ag.employeeId} className="glass-card p-4 rounded-2xl space-y-2 border border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-white text-sm">{ag.name}</p>
                <p className="text-xs font-mono text-slate-400">{ag.employeeId}</p>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  ag.workStatus === 'AVAILABLE'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : ag.workStatus === 'BUSY'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {ag.workStatus}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-800/60 text-xs space-y-1 text-slate-300 font-mono">
              <p className="flex items-center justify-between">
                <span>Working Hours Status:</span>
                <span className={ag.isWithinWorkingHours ? 'text-emerald-400' : 'text-amber-400'}>
                  {ag.isWithinWorkingHours ? 'Active Shift' : 'Off Shift'}
                </span>
              </p>
              <p className="flex items-center justify-between">
                <span>Coordinates:</span>
                <span>
                  {ag.latitude ? `${ag.latitude.toFixed(4)}, ${ag.longitude?.toFixed(4)}` : 'Location Unavailable'}
                </span>
              </p>
              <p className="flex items-center justify-between text-slate-400">
                <span>Last GPS Signal:</span>
                <span>{ag.lastUpdated ? new Date(ag.lastUpdated).toLocaleTimeString() : 'No signal yet'}</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
