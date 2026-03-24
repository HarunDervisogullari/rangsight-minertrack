"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
// import { MoreDotIcon } from "@/icons";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { GALLERY_ZONES, type GalleryZone } from "@/constants/galleryZones";
import { apiGalleries } from "@/lib";

type ZoneWithDensity = GalleryZone & {
  name: string; // RAN-* name
  capacity: number;
  crowd: number;
  density: number;
};

export default function DemographicCard() {
  const [isOpen, setIsOpen] = useState(false);
  const [zonesWithDensity, setZonesWithDensity] = useState<ZoneWithDensity[]>([]);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 1, height: 1 });

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect;
        setSize({ width, height });
      }
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiGalleries.get("/galleries");
        const data = response.data;

        // Match each gallery by location to zone.id
        const zoneData: ZoneWithDensity[] = GALLERY_ZONES.map((zone) => {
          const gallery = data.find((g: any) => g.location === zone.id);
          const name = gallery?.name || "Unknown";
          const capacity = gallery?.capacity ?? Math.floor(Math.random() * 40) + 20;
          const crowd = Math.floor(Math.random() * 80);
          const density = capacity > 0 ? crowd / capacity : 0;
          return { ...zone, name, capacity, crowd, density };
        });

        setZonesWithDensity(zoneData);
      } catch (err) {
        console.error("Failed to fetch gallery data", err);
      }
    };

    fetchData();
  }, []);

  function getColor(density: number) {
    if (density >= 1.0) return "rgba(239, 68, 68, 0.6)"; // red
    if (density >= 0.5) return "rgba(251, 191, 36, 0.6)"; // yellow
    return "rgba(34, 197, 94, 0.6)"; // green
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <div className="flex justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Gallery Density Map
          </h3>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            Visual density across all zones
          </p>
        </div>

      </div>

      <div className="px-4 py-6 my-6 border rounded-2xl bg-gray-50 dark:bg-gray-900 dark:border-gray-800 sm:px-6">
        <div
          ref={containerRef}
          className="relative w-full aspect-[1000/900] bg-center bg-no-repeat bg-contain"
        >
          <Image
            src="/images/minesolid.png"
            alt="Mine Map"
            fill
            className="object-contain select-none pointer-events-none rounded-lg"
          />

          {zonesWithDensity.map((zone) => {
            const { width, height } = size;
            const left = (zone.xPct / 100) * width;
            const top = (zone.yPct / 100) * height;
            const w = (zone.wPct / 100) * width;
            const h = (zone.hPct / 100) * height;

            return (
              <div
                key={zone.id}
                onMouseEnter={() => setHoveredZone(zone.id)}
                onMouseLeave={() => setHoveredZone(null)}
                className="absolute border border-gray-600 cursor-default rounded"
                style={{
                  top,
                  left,
                  width: w,
                  height: h,
                  backgroundColor: getColor(zone.density),
                }}
              >
                {hoveredZone === zone.id && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-200 font-medium px-2 py-1 rounded shadow z-50 text-center">
                    {zone.name} <br />
                    Density: {zone.density.toFixed(2)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
