"use client";


import type { GalleryAssignment } from "@/types/gallery";
import { X } from "lucide-react";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { GALLERY_ZONES, GalleryZone } from "@/constants/galleryZones";
import { toast } from "react-toastify";

interface Device {
  id: number;
  type: "hotspot" | "miner";
  x: number;
  y: number;
  name: string;
  galleryId: string;
}

type Props = {
  editMode: boolean;
  onZoneClick: (zone: GalleryZone, gallery?: GalleryAssignment) => void;
  addedGalleries: GalleryAssignment[];
  onDeleteGallery: (zoneId: string) => Promise<void>;
  devices?: Device[];
  focusedGallery?: string | null;
  onGalleryTitleClick?: (galleryId: string) => void;
  onDeviceClick?: (device: Device) => void;
};

export default function MineMap({ 
  editMode, 
  onZoneClick, 
  addedGalleries, 
  onDeleteGallery, 
  devices = [],
  focusedGallery = null,
  onGalleryTitleClick,
  onDeviceClick
}: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 1, height: 1 });
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect;
        setContainerSize({ width, height });
      }
    });

    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="relative w-full aspect-[1000/900]">
      <Image
        src="/images/minesolid.png"
        alt="Mine Map"
        fill
        className="object-contain select-none pointer-events-none"
        priority
      />

      {addedGalleries.map((gallery) => {
        const zone = GALLERY_ZONES.find((z) => z.id === gallery.id);
        if (!zone) return null;

        const { width, height } = containerSize;
        const left = (zone.xPct / 100) * width;
        const top = (zone.yPct / 100) * height;
        const w = (zone.wPct / 100) * width;
        const h = (zone.hPct / 100) * height;

        // Get devices for this gallery
        const galleryDevices = devices.filter(d => d.galleryId === gallery.id);
        
        // Apply zoom effect when gallery is focused
        const isFocused = focusedGallery === gallery.id;
        const zoomScale = isFocused ? 1.25 : 1;
        const zIndex = isFocused ? 30 : 10;

        return (
          <div
            key={gallery.id}
            onMouseEnter={() => setHoveredId(gallery.id)}
            onMouseLeave={() => setHoveredId(null)}
            className={`absolute transition-all duration-300 ease-in-out ${isFocused ? 'shadow-xl' : ''}`}
            style={{ 
              top, 
              left, 
              width: w, 
              height: h,
              transform: `scale(${zoomScale})`,
              transformOrigin: 'center center',
              zIndex
            }}
            onClick={() => onGalleryTitleClick?.(gallery.id)}
          >
            {/* Add semi-transparent background when focused to highlight the gallery */}
            {isFocused && (
              <div 
                className="absolute inset-0 bg-blue-400/10 backdrop-blur-sm rounded-md border-2 border-blue-400/30"
                style={{ 
                  boxShadow: '0 0 40px 5px rgba(59, 130, 246, 0.3)',
                  transform: 'scale(1.1)',
                  zIndex: -1
                }}
              />
            )}
            
            {/* Show gallery name only on hover */}
            {hoveredId === gallery.id && (
              <div 
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/80 dark:bg-gray-800/80 text-sm text-blue-800 dark:text-blue-300 font-medium px-3 py-1.5 rounded-lg shadow z-40 cursor-pointer backdrop-blur-sm"
              >
                {gallery.name}
              </div>
            )}

            {/* Render devices within the gallery */}
            {galleryDevices.map((device) => {
              const deviceLeft = (device.x / 100) * w;
              
              if (device.type === "hotspot") {
                return (
                  <div
                    key={device.id}
                    className={`absolute w-7 h-7 -translate-x-1/2 cursor-pointer hover:scale-110 transition-transform ${isFocused ? 'scale-120' : ''}`}
                    style={{ 
                      left: deviceLeft, 
                      top: 0, // Position at top of gallery
                      transform: `translateX(-50%) rotate(180deg) ${isFocused ? 'scale(1.2)' : 'scale(1)'}`,
                      zIndex: 35
                    }}
                    title={device.name}
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent gallery click
                      onDeviceClick?.(device);
                    }}
                  >
                    <Image
                      src="/images/modem.png"
                      alt={device.name}
                      width={28}
                      height={28}
                      className="w-full h-full object-contain"
                    />
                  </div>
                );
              } else {
                return (
                  <div
                    key={device.id}
                    className={`absolute w-12 h-12 -translate-x-1/2 cursor-pointer hover:scale-110 transition-transform ${isFocused ? 'scale-120' : ''}`}
                    style={{ 
                      left: deviceLeft, 
                      bottom: 0, // Position at bottom of gallery
                      transform: `translateX(-50%) ${isFocused ? 'scale(1.3)' : 'scale(1)'}`,
                      zIndex: 35
                    }}
                    title={device.name}
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent gallery click
                      onDeviceClick?.(device);
                    }}
                  >
                    <Image
                      src="/images/miner.gif"
                      alt={device.name}
                      width={48}
                      height={48}
                      className="w-full h-full object-contain miner-slow-animation"
                    />
                  </div>
                );
              }
            })}

            {editMode && (
              <>
                <button
                  className="absolute top-0 left-[30%] bg-white text-xs px-1 py-0.5 rounded cursor-pointer z-50"
                  onClick={() => {
                    const zoneObj = GALLERY_ZONES.find((z) => z.id === gallery.id);
                    if (zoneObj) onZoneClick(zoneObj, gallery);
                  }}
                >
                  ✎
                </button>
                <button
                  className="absolute top-0 left-1/2 -translate-x-1/2 bg-white text-xs px-1 py-0.5 rounded cursor-pointer z-50"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent event bubbling
                    console.log("🗑️ Delete button clicked for gallery:", gallery.id);
                    onDeleteGallery(gallery.id);
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
                <div
                  className="absolute inset-0 cursor-pointer"
                  onClick={() => {
                    const zoneObj = GALLERY_ZONES.find((z) => z.id === gallery.id);
                    if (zoneObj) onZoneClick(zoneObj, gallery);
                  }}
                />
              </>
            )}
          </div>
        );
      })}

      {editMode &&
        GALLERY_ZONES.map((zone) => {
          const isAssigned = addedGalleries.some((g) => g.id === zone.id);
          if (isAssigned) return null;

          const { width, height } = containerSize;
          const left = (zone.xPct / 100) * width;
          const top = (zone.yPct / 100) * height;
          const w = (zone.wPct / 100) * width;
          const h = (zone.hPct / 100) * height;

          return (
            <div
              key={zone.id}
              onClick={() => onZoneClick(zone)}
              onMouseEnter={() => setHoveredId(zone.id)}
              onMouseLeave={() => setHoveredId(null)}
              className="absolute cursor-pointer border-2"
              style={{
                top,
                left,
                width: w,
                height: h,
                backgroundColor: hoveredId === zone.id ? "rgba(0, 123, 255, 0.2)" : "transparent",
                borderColor: hoveredId === zone.id ? "#007bff" : "#aaa",
              }}
            />
          );
        })}
    </div>
  );
}
