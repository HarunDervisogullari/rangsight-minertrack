"use client";

import { useState, useEffect } from "react";
import MineMap from "@/components/map/MineMap";
import type { GalleryAssignment } from "@/types/gallery";
import { GalleryZone } from "@/constants/galleryZones";
import { toast } from "react-toastify";
import Image from "next/image";
import apiGalleries from "@/lib/axiosGallery";
import apiDevices from "@/lib/axiosDevices";

// Interface for devices displayed on the map
interface DisplayableDevice {
  id: number; // Actual device ID
  type: "hotspot" | "miner";
  x: number; // percentage within gallery
  y: number; // percentage within gallery
  name: string; // Hotspot label or Person's name for miner
  galleryId: string; // Gallery's LOCATION string (e.g., "zone-X") for MineMap filtering
  signalStrength?: number; // For hotspots
  connectedMiners?: number; // For hotspots
  batteryLevel?: number; // For miners
  connectedToHotspotId?: string; // For miners - ID of the hotspot they are connected to
  rxPowerToStrongestHotspot?: number; // For miners - RX power to their strongest hotspot
  // rawDeviceData?: RawDevice; // Optional: to store the original device object if needed for the modal
}

// Interface for devices fetched from your device-service API
interface RawDevice {
  id: number;
  label: string;
  type: string; // "Hotspot" or "Helmet"
  owned: string; // Gallery name for Hotspot, Person name for Helmet
  barcode: string; // MAC address for Helmets
  isOn: boolean;
}

interface DeviceInfoModalProps {
  device: DisplayableDevice | null;
  onClose: () => void;
  // We might need allRawDevices to find hotspot name by id for miners
  // allRawDevices: RawDevice[]; 
}

const DeviceInfoModal: React.FC<DeviceInfoModalProps> = ({ device, onClose }) => {
  if (!device) return null;

  let connectedHotspotInfo = "N/A";
  if (device.type === "miner" && device.connectedToHotspotId) {
    // In a future state, you would look up the hotspot's name using its ID
    // For now, we just display the ID.
    // Example: const hotspot = allRawDevices.find(d => d.type === 'Hotspot' && String(d.id) === device.connectedToHotspotId);
    // connectedHotspotInfo = hotspot ? hotspot.label : `Hotspot ID: ${device.connectedToHotspotId}`;
    connectedHotspotInfo = `Hotspot ID: ${device.connectedToHotspotId}`;
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg w-80 mx-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
            {device.type === 'hotspot' ? 'Hotspot' : 'Miner'} Details
          </h3>
        </div>
        
        <div className="flex items-center gap-3 mb-4">
          <div className="w-16 h-16 flex-shrink-0">
            <Image
              src={device.type === "hotspot" ? "/images/modem.png" : "/images/miner.gif"}
              alt={device.name}
              width={64}
              height={64}
              className={`w-full h-full object-contain ${device.type === "miner" ? "miner-slow-animation" : ""}`}
            />
          </div>
          <div>
            <h4 className="text-base font-medium text-gray-800 dark:text-white">{device.name}</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Device ID: {device.id}
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <p className="text-gray-500 dark:text-gray-400">Type</p>
            <p className="font-medium text-gray-800 dark:text-white capitalize">{device.type}</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Status</p>
            <p className="font-medium text-green-600 dark:text-green-400">Active</p> {/* Assuming all displayed are active for now */}
          </div>
          
          {device.type === "hotspot" ? (
            <>
              <div className="mt-1">
                <p className="text-gray-500 dark:text-gray-400">Signal Strength</p>
                <p className="font-medium text-gray-800 dark:text-white">{device.signalStrength || 0}%</p>
              </div>
              <div className="mt-1">
                <p className="text-gray-500 dark:text-gray-400">Connected Miners</p>
                <p className="font-medium text-gray-800 dark:text-white">{device.connectedMiners || 0}</p>
              </div>
            </>
          ) : (
            <>
              <div className="mt-1">
                <p className="text-gray-500 dark:text-gray-400">Battery Level</p>
                <p className="font-medium text-gray-800 dark:text-white">{device.batteryLevel || 0}%</p>
              </div>
              <div className="mt-1">
                <p className="text-gray-500 dark:text-gray-400">Connected To</p>
                <p className="font-medium text-gray-800 dark:text-white">{connectedHotspotInfo}</p>
              </div>
              {device.rxPowerToStrongestHotspot !== undefined && (
                <div className="mt-1">
                  <p className="text-gray-500 dark:text-gray-400">RSSI</p>
                  <p className="font-medium text-gray-800 dark:text-white">
                    {device.rxPowerToStrongestHotspot.toFixed(0)} dBm
                  </p>
                </div>
              )}
            </>
          )}
        </div>
        
        <div className="text-right mt-4">
          <button 
            onClick={onClose}
            className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Mine topology definition based on the provided diagram
const MINE_TOPOLOGY: Record<number, string[]> = {
  1: ["RAN1", "RAN2", "RAN3", "RAN4"],
  2: ["RAN5", "RAN6", "RAN7", "RAN8", "RAN9"],
  3: ["RAN10", "RAN11", "RAN12", "RAN13", "RAN14"],
  4: ["RAN15", "RAN16", "RAN17", "RAN18", "RAN19"],
  5: ["RAN121212", "RAN4513"], // Future galleries not yet defined
  6: [] // Future level
};

// Type for level numbers
type LevelNumber = 1 | 2 | 3 | 4 | 5 | 6;

// Enhanced interface for miner data with RX powers
interface MinerLinkWithRxPowers {
  macAddress: string;
  strongestHotspotId: number;
  batteryLevel: number;
  timestamp: string;
  rxPowers: Array<{
    hotspotId: number;
    rxPower: number; // -30 to -100 dBm
  }>;
}

// Function to get neighboring galleries
function getNeighboringGalleries(galleryName: string): string[] {
  const neighbors: string[] = [];
  
  // Find the gallery in the topology
  for (const [level, galleries] of Object.entries(MINE_TOPOLOGY)) {
    const galleryIndex = galleries.indexOf(galleryName);
    if (galleryIndex !== -1) {
      const levelNum = parseInt(level);
      const levelGalleries = galleries;
      
      // Add horizontal neighbors (same level)
      if (galleryIndex > 0) {
        neighbors.push(levelGalleries[galleryIndex - 1]); // Left neighbor
      }
      if (galleryIndex < levelGalleries.length - 1) {
        neighbors.push(levelGalleries[galleryIndex + 1]); // Right neighbor
      }
      
      // Add vertical neighbors (adjacent levels)
      // Assuming galleries at same index position are vertically connected
      const upperLevel = MINE_TOPOLOGY[levelNum - 1];
      const lowerLevel = MINE_TOPOLOGY[levelNum + 1];
      
      if (upperLevel && upperLevel[galleryIndex]) {
        neighbors.push(upperLevel[galleryIndex]); // Upper neighbor
      }
      if (lowerLevel && lowerLevel[galleryIndex]) {
        neighbors.push(lowerLevel[galleryIndex]); // Lower neighbor
      }
      
      break;
    }
  }
  
  return neighbors;
}

// Function to get relative direction between two neighboring galleries
function getDirectionOffset(fromGallery: string, toGallery: string): { x: number, y: number } {
  // Find positions in topology
  let fromLevel = 0, fromIndex = 0, toLevel = 0, toIndex = 0;
  
  for (const [level, galleries] of Object.entries(MINE_TOPOLOGY)) {
    const levelNum = parseInt(level);
    const fromIdx = galleries.indexOf(fromGallery);
    const toIdx = galleries.indexOf(toGallery);
    
    if (fromIdx !== -1) {
      fromLevel = levelNum;
      fromIndex = fromIdx;
    }
    if (toIdx !== -1) {
      toLevel = levelNum;
      toIndex = toIdx;
    }
  }
  
  // Calculate directional offset
  const levelDiff = toLevel - fromLevel;
  const indexDiff = toIndex - fromIndex;
  
  return {
    x: indexDiff !== 0 ? (indexDiff > 0 ? 1 : -1) : 0, // Right/Left
    y: levelDiff !== 0 ? (levelDiff > 0 ? 1 : -1) : 0   // Down/Up
  };
}

// Function to calculate dynamic position based on RX signal powers
function calculateDynamicPosition(
  minerData: MinerLinkWithRxPowers,
  allGalleries: GalleryAssignment[],
  allHotspots: RawDevice[]
): { x: number, y: number } {
  // Find the primary gallery (where strongest hotspot is located)
  const strongestHotspot = allHotspots.find(h => h.id === minerData.strongestHotspotId);
  if (!strongestHotspot) {
    return { x: 50, y: 50 }; // Default center position
  }
  
  const primaryGallery = allGalleries.find(g => g.name.toLowerCase() === strongestHotspot.owned.toLowerCase());
  if (!primaryGallery) {
    return { x: 50, y: 50 }; // Default center position
  }
  
  // Start with center position of primary gallery
  let x = 50;
  let y = 50;
  
  // Get the strongest signal power for normalization
  const strongestRxPower = minerData.rxPowers.find(rx => rx.hotspotId === minerData.strongestHotspotId)?.rxPower || -100;
  
  // Get neighboring galleries
  const neighboringGalleries = getNeighboringGalleries(primaryGallery.name);
  
  // Analyze secondary signals from neighboring galleries
  const secondarySignals = minerData.rxPowers
    .filter(rx => rx.hotspotId !== minerData.strongestHotspotId)
    .sort((a, b) => b.rxPower - a.rxPower); // Strongest secondary signals first
  
  for (const secondarySignal of secondarySignals.slice(0, 3)) { // Consider top 3 secondary signals
    const secondaryHotspot = allHotspots.find(h => h.id === secondarySignal.hotspotId);
    if (!secondaryHotspot) continue;
    
    const secondaryGallery = allGalleries.find(g => g.name.toLowerCase() === secondaryHotspot.owned.toLowerCase());
    if (!secondaryGallery) continue;
    
    // Check if this is a neighboring gallery
    if (neighboringGalleries.includes(secondaryGallery.name)) {
      // Calculate signal strength ratio (how close is secondary to primary)
      // RX powers are negative, so we need to handle the math correctly
      const primaryStrength = Math.abs(strongestRxPower); // e.g., 45 from -45
      const secondaryStrength = Math.abs(secondarySignal.rxPower); // e.g., 75 from -75
      
      // Signal ratio: closer to 1 means signals are similar (miner is near boundary)
      // closer to 0 means secondary is much weaker (miner is far from boundary)
      const signalRatio = Math.max(0, Math.min(1, (100 - secondaryStrength) / (100 - primaryStrength)));
      
      // Get direction offset toward the neighboring gallery
      const directionOffset = getDirectionOffset(primaryGallery.name, secondaryGallery.name);
      
      // Apply offset based on signal strength ratio
      const offsetStrength = signalRatio * 25; // Maximum 25% offset in each direction
      x += directionOffset.x * offsetStrength;
      y += directionOffset.y * offsetStrength;
    }
  }
  
  // Ensure position stays within reasonable gallery bounds (10% to 90%)
  return {
    x: Math.max(10, Math.min(90, x)),
    y: Math.max(10, Math.min(90, y))
  };
}

export default function GalleryMonitorClient() {
  const [galleries, setGalleries] = useState<GalleryAssignment[]>([]);
  const [displayableDevices, setDisplayableDevices] = useState<DisplayableDevice[]>([]);
  // const [allRawDevices, setAllRawDevices] = useState<RawDevice[]>([]); // Store for modal lookups if needed
  const [focusedGallery, setFocusedGallery] = useState<string | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<DisplayableDevice | null>(null);
  const [wsConnected, setWsConnected] = useState(false); // Track WebSocket connection status
  
  // Add state for debug data
  const [activeMinerLinks, setActiveMinerLinks] = useState<any[]>([]);
  const [rawDevicesData, setRawDevicesData] = useState<RawDevice[]>([]);

  // WebSocket for real-time MQTT updates (optional, with polling fallback)
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connectWebSocket = () => {
      try {
        ws = new WebSocket('ws://localhost:9001');
        
        ws.onopen = () => {
          console.log('[WebSocket] Connected to MQTT broker for real-time updates');
          setWsConnected(true);
          // Subscribe to MQTT topic for real-time miner data
          const subscribeMessage = JSON.stringify({
            topic: 'mine/gallery/raw',
            action: 'subscribe'
          });
          ws?.send(subscribeMessage);
        };

        ws.onmessage = (event) => {
          try {
            // When we receive new MQTT data, trigger a fresh data fetch
            // This provides near-instant updates for handover scenarios
            console.log('[WebSocket] Received MQTT update, refreshing data...');
            fetchData();
          } catch (error) {
            console.error('[WebSocket] Error processing message:', error);
          }
        };

        ws.onclose = () => {
          console.log('[WebSocket] Connection closed, attempting reconnect in 5 seconds...');
          setWsConnected(false);
          reconnectTimeout = setTimeout(connectWebSocket, 5000);
        };

        ws.onerror = (error) => {
          console.error('[WebSocket] Connection error:', error);
          setWsConnected(false);
        };
      } catch (error) {
        console.error('[WebSocket] Failed to create connection:', error);
        setWsConnected(false);
        // Fallback to polling only if WebSocket fails
      }
    };

    // Try to establish WebSocket connection
    connectWebSocket();

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (ws) {
        ws.close();
      }
    };
  }, []);

  const fetchData = async () => {
    try {
      // 1. Fetch galleries
      const galleriesRes = await apiGalleries.get("/galleries");
      const rawGalleriesData = galleriesRes.data;
      const mappedGalleries: GalleryAssignment[] = rawGalleriesData.map((gallery: any) => ({
        id: gallery.location, // Used by MineMap as the unique key for a gallery zone (e.g., "zone-X")
        name: gallery.name,
        galleryId: gallery.id, // Actual database ID for API calls
        capacity: gallery.capacity ?? 0,
      }));
      setGalleries(mappedGalleries);

      // 2. Fetch all raw devices (Hotspots and Helmets) from device-service
      const rawDevicesRes = await apiDevices.get("/devices");
      const rawDevicesData: RawDevice[] = rawDevicesRes.data;
      setRawDevicesData(rawDevicesData); // Store for debug display
      // setAllRawDevices(rawDevicesData); // Store if needed for modal lookups

      const currentDisplayableDevices: DisplayableDevice[] = [];
      const minerOffsets: { [galleryLocation: string]: number } = {}; // To track miner count per gallery for staggering

      // 3. Process Hotspots for display
      const hotspotsFromApi = rawDevicesData.filter(device => device.type.toLowerCase() === "hotspot");
      
      // 4. Fetch and Process Miners from the new backend service (port 8001) FIRST
      // We need miner data to calculate connected miners count for hotspots
      let processedMiners: DisplayableDevice[] = [];
      let activeMinerLinks: any[] = []; // Store the raw miner links data for hotspot processing
      try {
        const minerLinksRes = await fetch("http://127.0.0.1:8001/api/miners/active-links");
        if (!minerLinksRes.ok) {
          throw new Error(`Failed to fetch miner links: ${minerLinksRes.status}`);
        }
        activeMinerLinks = await minerLinksRes.json(); // Store the data
        setActiveMinerLinks(activeMinerLinks); // Store for debug display

        activeMinerLinks.forEach((minerLink: any) => {
          const rawHelmetDevice = rawDevicesData.find(
            d => d.type.toLowerCase() === 'helmet' && d.barcode === minerLink.macAddress
          );

          if (!rawHelmetDevice) {
            console.warn(`No raw helmet device found for MAC: ${minerLink.macAddress}`);
            return; 
          }

          const strongestHotspotDevice = rawDevicesData.find(
            d => d.type.toLowerCase() === 'hotspot' && d.id === minerLink.strongestHotspotId
          );

          if (!strongestHotspotDevice) {
            console.warn(`No raw hotspot device found for ID: ${minerLink.strongestHotspotId} (for miner MAC: ${minerLink.macAddress})`);
            return; 
          }

          const galleryOfStrongestHotspot = mappedGalleries.find(
            g => g.name.toLowerCase() === strongestHotspotDevice.owned.toLowerCase()
          );

          if (!galleryOfStrongestHotspot) {
            console.warn(`No gallery found for hotspot ${strongestHotspotDevice.label} (owned by: ${strongestHotspotDevice.owned})`);
            return; 
          }

          // Enhanced positioning logic for handover simulation
          let minerPosition: { x: number, y: number };
          let rxPowerToStrongestForDisplay: number | undefined = undefined;

          if (minerLink.rxPowers && Array.isArray(minerLink.rxPowers) && minerLink.rxPowers.length >= 2) {
            // Multi-hotspot scenario - calculate position based on signal ratio
            const strongestRxLink = minerLink.rxPowers.find(
              (rx: any) => rx.hotspotId === minerLink.strongestHotspotId
            );
            
            if (strongestRxLink && typeof strongestRxLink.rxPower === 'number') {
              rxPowerToStrongestForDisplay = strongestRxLink.rxPower;
            }

            // Find the two main hotspots (TEST-HOTSPOT-001 and TEST-HOTSPOT-002)
            const hotspot1Signal = minerLink.rxPowers.find((rx: any) => 
              rawDevicesData.find(d => d.id === rx.hotspotId && d.barcode === 'TEST-HOTSPOT-001')
            );
            const hotspot2Signal = minerLink.rxPowers.find((rx: any) => 
              rawDevicesData.find(d => d.id === rx.hotspotId && d.barcode === 'TEST-HOTSPOT-002')
            );

            if (hotspot1Signal && hotspot2Signal) {
              // Calculate position based on signal strength ratio
              const signal1 = hotspot1Signal.rxPower; // e.g., -30 to -100
              const signal2 = hotspot2Signal.rxPower; // e.g., -30 to -100
              
              // Convert to positive values for easier calculation (30 to 100)
              const strength1 = Math.abs(signal1);
              const strength2 = Math.abs(signal2);
              
              // Calculate ratio: 0 = fully at hotspot1, 1 = fully at hotspot2
              const totalStrength = strength1 + strength2;
              const ratio = totalStrength > 0 ? strength1 / totalStrength : 0.5;
              
              // Position miners in the gallery based on which hotspot is stronger
              const strongestHotspotBarcode = rawDevicesData.find(d => d.id === minerLink.strongestHotspotId)?.barcode;
              
              if (strongestHotspotBarcode === 'TEST-HOTSPOT-001') {
                // Miner is closer to hotspot 1 (QWE gallery)
                // Position based on signal strength difference
                const signalDiff = Math.abs(signal1 - signal2);
                const maxDiff = 70; // Max expected difference (-30 to -100)
                const normalizedDiff = Math.min(signalDiff / maxDiff, 1);
                
                minerPosition = {
                  x: 30 + (ratio * 40), // Move between left and center of gallery
                  y: 20 + (normalizedDiff * 30) // Vary Y position based on signal difference
                };
              } else {
                // Miner is closer to hotspot 2 (ASD gallery)
                const signalDiff = Math.abs(signal1 - signal2);
                const maxDiff = 70;
                const normalizedDiff = Math.min(signalDiff / maxDiff, 1);
                
                minerPosition = {
                  x: 40 + ((1 - ratio) * 40), // Move between center and right of gallery
                  y: 20 + (normalizedDiff * 30)
                };
              }
              
              console.log(`Miner ${minerLink.macAddress}: Signal1=${signal1}, Signal2=${signal2}, Strongest=${strongestHotspotBarcode}, Position=(${minerPosition.x.toFixed(1)}, ${minerPosition.y.toFixed(1)})`);
            } else {
              // Fallback to simple positioning
              minerPosition = { x: 50, y: 50 };
            }
          } else {
            // Single hotspot or no rx data - simple positioning
            const currentRxPower = rxPowerToStrongestForDisplay !== undefined ? rxPowerToStrongestForDisplay : -100;
            
            const galleryLocationKey = galleryOfStrongestHotspot.id;
            if (!minerOffsets[galleryLocationKey]) {
              minerOffsets[galleryLocationKey] = 0;
            }
            const staggerIndex = minerOffsets[galleryLocationKey];
            minerOffsets[galleryLocationKey]++;

            const hotspotBaseX = 35;
            const hotspotBaseY = 10;

            // Map RX power to distance
            const minRx = -100, maxRx = -30;
            const minDistancePercentage = 10, maxDistancePercentage = 40;

            const normalizedRx = Math.max(0, Math.min(1, (currentRxPower - minRx) / (maxRx - minRx)));
            const distance = maxDistancePercentage - normalizedRx * (maxDistancePercentage - minDistancePercentage);
            
            const angle = (staggerIndex % 8) * (Math.PI / 4);

            minerPosition = {
              x: hotspotBaseX + distance * Math.cos(angle),
              y: hotspotBaseY + distance * Math.sin(angle),
            };
          }
          
          // Ensure position stays within reasonable gallery bounds
          minerPosition.x = Math.max(5, Math.min(95, minerPosition.x));
          minerPosition.y = Math.max(5, Math.min(95, minerPosition.y));
          
          processedMiners.push({
            id: rawHelmetDevice.id,
            type: "miner",
            name: rawHelmetDevice.owned, 
            galleryId: galleryOfStrongestHotspot.id,
            x: minerPosition.x,
            y: minerPosition.y,
            batteryLevel: minerLink.batteryLevel,
            connectedToHotspotId: String(minerLink.strongestHotspotId),
            rxPowerToStrongestHotspot: rxPowerToStrongestForDisplay, 
          });
        });
      } catch (error) {
        console.error("Failed to fetch or process miner active-links:", error);
        // Continue with hotspot processing even if miner data fails
      }

      // Now process hotspots with accurate connected miners count
      let hotspotIndexPerGallery: { [galleryId: string]: number } = {}; // Track hotspot index per gallery for positioning

      hotspotsFromApi.forEach(hotspot => {
        const matchedGallery = mappedGalleries.find(g => g.name.toLowerCase() === hotspot.owned.toLowerCase());
        if (matchedGallery) {
          // Count how many miners this hotspot can detect (receives signals from)
          let connectedMinersCount = 0;
          
          activeMinerLinks.forEach((minerLink: any) => {
            // Check if this miner has RX power data for this specific hotspot
            if (minerLink.rxPowers && Array.isArray(minerLink.rxPowers)) {
              const hasSignalFromThisHotspot = minerLink.rxPowers.some(
                (rxPower: any) => rxPower.hotspotId === hotspot.id
              );
              if (hasSignalFromThisHotspot) {
                connectedMinersCount++;
              }
            } else {
              // Fallback: if no rxPowers data, use the old logic (strongest hotspot only)
              if (minerLink.strongestHotspotId === hotspot.id) {
                connectedMinersCount++;
              }
            }
          });

          // Calculate dynamic positioning for multiple hotspots in same gallery
          const galleryId = matchedGallery.id;
          if (!hotspotIndexPerGallery[galleryId]) {
            hotspotIndexPerGallery[galleryId] = 0;
          }
          
          const hotspotIndex = hotspotIndexPerGallery[galleryId];
          hotspotIndexPerGallery[galleryId]++;
          
          // Distribute hotspots horizontally across the gallery top
          const totalHotspotsInGallery = hotspotsFromApi.filter(h => 
            mappedGalleries.find(g => g.name.toLowerCase() === h.owned.toLowerCase())?.id === galleryId
          ).length;
          
          let hotspotX: number;
          let hotspotY = 10; // Keep Y position at top of gallery
          
          if (totalHotspotsInGallery === 1) {
            // Single hotspot: center position
            hotspotX = 50;
          } else {
            // Multiple hotspots: distribute evenly with margins
            const leftMargin = 15;
            const rightMargin = 15;
            const availableWidth = 100 - leftMargin - rightMargin;
            const spacing = availableWidth / (totalHotspotsInGallery - 1);
            hotspotX = leftMargin + (hotspotIndex * spacing);
          }

          currentDisplayableDevices.push({
            id: hotspot.id,
            type: "hotspot",
            name: hotspot.label,
            galleryId: matchedGallery.id, // This is the gallery.location (e.g. "zone-X")
            x: hotspotX, // Dynamic X position based on hotspot index in gallery
            y: hotspotY, // Y position at top of gallery
            signalStrength: 85, // Static signal strength for now
            connectedMiners: connectedMinersCount, // Real count based on signal detection
          });
        }
      });
      
      // Add all processed miners to the displayable devices
      currentDisplayableDevices.push(...processedMiners);

      console.log("Final currentDisplayableDevices before setting state:", JSON.stringify(currentDisplayableDevices, null, 2));
      setDisplayableDevices(currentDisplayableDevices);

    } catch (error) {
      console.error("Failed to fetch initial gallery or device data:", error);
      if (error instanceof Error) {
        toast.error(`Failed to load data: ${error.message}`);
      } else {
        toast.error("Failed to load gallery/device data (unknown error)");
      }
    }
  };

  // Helper function for future miner logic (example)
  // const findGalleryOfHotspot = (hotspotId: number, galleries: GalleryAssignment[], rawDevices: RawDevice[]): GalleryAssignment | undefined => {
  //   const hotspotDevice = rawDevices.find(d => d.id === hotspotId && d.type.toLowerCase() === 'hotspot');
  //   if (!hotspotDevice) return undefined;
  //   return galleries.find(g => g.name.toLowerCase() === hotspotDevice.owned.toLowerCase());
  // };

  useEffect(() => {
    fetchData(); // Initial fetch
    // Use adaptive interval: 2 seconds for slow, visible movement
    const intervalTime = 2000; // 2 seconds for slow, visible miner movement
    const intervalId = setInterval(fetchData, intervalTime);
    return () => clearInterval(intervalId); // Cleanup interval on component unmount
  }, [wsConnected]); // Re-run when WebSocket connection status changes

  const handleGalleryClick = (galleryId: string) => {
    setFocusedGallery(galleryId === focusedGallery ? null : galleryId);
  };

  const handleDeviceClick = (device: DisplayableDevice) => {
    setSelectedDevice(device);
  };

  const handleCloseDeviceInfo = () => {
    setSelectedDevice(null);
  };

  const handleZoneClick = (zone: GalleryZone, gallery?: GalleryAssignment) => {
    if (gallery) {
      handleGalleryClick(gallery.id); // gallery.id is the location string like "zone-X"
    }
  };

  return (
    <div className="relative h-full w-full">
      <div className="absolute top-4 right-4 z-50 flex gap-2">
        <div className="bg-white/90 dark:bg-gray-800/90 px-3 py-2 rounded-lg shadow-md">
          <div className="flex items-center gap-2 text-sm">
            <Image src="/images/modem.png" alt="Hotspot" width={20} height={20} />
            <span className="text-gray-700 dark:text-gray-200">Hotspots</span>
          </div>
          <div className="flex items-center gap-2 text-sm mt-1">
            <Image src="/images/miner.gif" alt="Miner" width={20} height={20} className="miner-slow-animation" />
            <span className="text-gray-700 dark:text-gray-200">Miners</span>
          </div>
          {/* WebSocket connection status */}
          <div className="flex items-center gap-2 text-xs mt-1">
            <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-gray-600 dark:text-gray-300">
              {wsConnected ? 'Real-time' : 'Polling'}
            </span>
          </div>
        </div>
      </div>

      <MineMap
        editMode={false}
        onZoneClick={handleZoneClick}
        addedGalleries={galleries}
        onDeleteGallery={async () => {}} // No-op for now
        devices={displayableDevices}
        focusedGallery={focusedGallery}
        onGalleryTitleClick={handleGalleryClick}
        onDeviceClick={handleDeviceClick}
      />

      <DeviceInfoModal 
        device={selectedDevice} 
        onClose={handleCloseDeviceInfo}
        // allRawDevices={allRawDevices} // Pass if modal needs it for lookups
      />

      {/* Debugging Section - Remove or comment out for production */}
      {process.env.NODE_ENV === 'development' && displayableDevices.length > 0 && (
        <div className="absolute bottom-0 left-0 z-50 bg-gray-800/90 text-white p-3 text-xs overflow-auto max-h-64 w-96">
          <h4 className="font-bold mb-2 text-green-400">🔄 Live Handover Simulation Debug:</h4>
          {displayableDevices.filter(d => d.type === 'miner').map(device => {
            // Try to get the raw miner data for detailed signal info
            const minerData = activeMinerLinks?.find((m: any) => {
              const helmetDevice = rawDevicesData.find(d => d.type.toLowerCase() === 'helmet' && d.id === device.id);
              return helmetDevice && m.macAddress === helmetDevice.barcode;
            });
            
            return (
              <div key={`debug-${device.id}`} className="mb-3 p-2 border border-gray-600 rounded">
                <p className="text-yellow-300 font-semibold">🚶 Miner: {device.name} ({device.id})</p>
                <p>&nbsp;&nbsp;📍 Gallery: {device.galleryId} | Position: ({device.x.toFixed(1)}, {device.y.toFixed(1)})</p>
                <p>&nbsp;&nbsp;🔗 Connected to Hotspot ID: {device.connectedToHotspotId}</p>
                <p>&nbsp;&nbsp;🔋 Battery: {device.batteryLevel}% | 📶 Main RSSI: {device.rxPowerToStrongestHotspot?.toFixed(0) || 'N/A'} dBm</p>
                {minerData && minerData.rxPowers && (
                  <div className="mt-1">
                    <p className="text-cyan-300">&nbsp;&nbsp;📡 Signal Details:</p>
                    {minerData.rxPowers.map((rx: any, idx: number) => {
                      const hotspot = rawDevicesData.find(d => d.id === rx.hotspotId);
                      const isStrongest = rx.hotspotId === minerData.strongestHotspotId;
                      return (
                        <p key={idx} className={`text-xs ${isStrongest ? 'text-green-400' : 'text-gray-300'}`}>
                          &nbsp;&nbsp;&nbsp;&nbsp;{hotspot?.barcode || `ID:${rx.hotspotId}`}: {rx.rxPower} dBm {isStrongest ? '👑' : ''}
                        </p>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          
          <div className="border-t border-gray-600 pt-2 mt-2">
            <h4 className="font-bold text-blue-400">📡 Hotspots:</h4>
            {displayableDevices.filter(d => d.type === 'hotspot').map(device => (
              <div key={`debug-hs-${device.id}`} className="mb-1">
                <p className="text-orange-300">🏠 {device.name} (ID: {device.id}) in {device.galleryId}</p>
                <p>&nbsp;&nbsp;👥 Connected Miners: {device.connectedMiners} | 📶 Signal: {device.signalStrength}%</p>
              </div>
            ))}
          </div>
          
          <div className="text-xs text-gray-400 mt-2">
            ⏱️ Refresh: 2s | 🔄 Real-time updates enabled
          </div>
        </div>
      )}
    </div>
  );
} 