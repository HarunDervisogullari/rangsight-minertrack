"use client";

import type { GalleryAssignment } from "@/types/gallery";
import { useState, useEffect } from "react";
import MineMap from "@/components/map/MineMap";
import AddGalleryModal from "@/components/map/AddGalleryModal";
import { GalleryZone } from "@/constants/galleryZones";
import { toast } from "react-toastify";
import apiGalleries from "@/lib/axiosGallery";

export default function MapPageClient() {


  const [editMode, setEditMode] = useState(false);
  const [selectedZone, setSelectedZone] = useState<GalleryZone | null>(null);
  const [selectedGallery, setSelectedGallery] = useState<GalleryAssignment | null>(null);
  const [addedGalleries, setAddedGalleries] = useState<GalleryAssignment[]>([]);

  const fetchGalleries = async () => {
    try {
      const response = await apiGalleries.get("/galleries");
      const data = response.data;
      const mapped = data.map((gallery: any) => ({
        id: gallery.location,
        name: gallery.name,
        galleryId: gallery.id,
        capacity: gallery.capacity ?? 0, // ensure fallback
      }));
      setAddedGalleries(mapped);
    } catch (error) {
      console.error("Failed to fetch galleries:", error);
    }
  };

  useEffect(() => {
    fetchGalleries();
  }, []);

  const handleZoneClick = (zone: GalleryZone, gallery?: GalleryAssignment) => {
    setSelectedZone(zone);
    setSelectedGallery(gallery || null);
  };

  const handleSaveGallery = async (zone: GalleryZone, name: string, capacity: number, isEdit: boolean) => {
    const existing = addedGalleries.find(g => g.id === zone.id);
    const nameExists = addedGalleries.some(g => g.name.toLowerCase() === name.toLowerCase() && g.id !== zone.id);

    if (nameExists) {
      toast.error("A gallery with this name already exists!");
      return;
    }

    try {
      if (existing && isEdit) {
        // Update existing gallery
        await apiGalleries.put(`/galleries/${existing.galleryId}`, {
          name,
          location: zone.id,
          level: zone.level,
          capacity,
        });
        toast.success("Gallery updated successfully.");
      } else {
        // Create new gallery
        await apiGalleries.post("/galleries", {
          name,
          location: zone.id,
          level: zone.level,
          capacity,
        });
        toast.success("Gallery created successfully.");
      }

      await fetchGalleries();
    } catch (error) {
      console.error("Error saving gallery:", error);
      toast.error("Failed to save gallery.");
    }
  };

  const handleDeleteGallery = async (zoneId: string) => {
    console.log("🗑️ DELETE GALLERY CALLED:", zoneId); // Debug log
    const gallery = addedGalleries.find(g => g.id === zoneId);
    if (!gallery) {
      console.error("❌ Gallery not found for zoneId:", zoneId);
      return;
    }

    if (!confirm("Are you sure you want to delete this gallery?")) return;

    try {
      console.log("🏛️ Deleting gallery through gallery service (which handles device cleanup):", gallery.galleryId);
      
      // Call gallery service DELETE endpoint - it handles device cleanup internally
      await apiGalleries.delete(`/galleries/${gallery.galleryId}`);

      toast.success("Gallery deleted successfully!");
      await fetchGalleries();
      console.log("✅ Gallery deletion completed successfully");
    } catch (error) {
      console.error("❌ Error deleting gallery:", error);
      toast.error(`Failed to delete gallery: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <div className="relative h-full w-full">
      <button
        onClick={() => setEditMode(!editMode)}
        className="absolute top-4 right-4 z-50 px-4 py-2 bg-blue-600 text-white rounded shadow-md hover:bg-blue-700"
      >
        {editMode ? "Exit Edit Mode" : "Edit"}
      </button>

      <MineMap
        editMode={editMode}
        onZoneClick={handleZoneClick}
        addedGalleries={addedGalleries}
        onDeleteGallery={handleDeleteGallery}
      />

      <AddGalleryModal
        zone={selectedZone}
        existingGallery={selectedGallery}
        onSave={handleSaveGallery}
        onClose={() => {
          setSelectedZone(null);
          setSelectedGallery(null);
          setEditMode(false);
        }}
        onDetachGallery={
          selectedGallery ? () => handleDeleteGallery(selectedGallery.id) : undefined
        }
      />
    </div>
  );
}
