"use client";

import { useState, useEffect } from "react";
import { GalleryZone } from "@/constants/galleryZones";
import { toast } from "react-toastify";

type GalleryAssignment = {
  id: string;
  name: string;
  capacity?: number;
};

type Props = {
  zone: GalleryZone | null;
  existingGallery: GalleryAssignment | null;
  onSave: (zone: GalleryZone, name: string, capacity: number, isEdit: boolean) => Promise<void>;
  onClose: () => void;
  onDetachGallery?: () => Promise<void>;
};

export default function AddGalleryModal({
  zone,
  existingGallery,
  onSave,
  onClose,
  onDetachGallery,
}: Props) {
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [detaching, setDetaching] = useState(false);

  useEffect(() => {
    if (zone) {
      setName(existingGallery?.name || "");
      setCapacity(existingGallery?.capacity || 0);
    }
  }, [zone, existingGallery]);

  if (!zone) return null;

  const handleSave = async () => {
    if (!name.trim()) {
      toast.warn("Please enter a gallery name.");
      return;
    }

    if (capacity < 0) {
      toast.warn("Capacity must be a positive number.");
      return;
    }

    try {
      setLoading(true);
      await onSave(zone, name.trim(), capacity, !!existingGallery);
      toast.success(existingGallery ? "Gallery updated successfully!" : "Gallery added successfully!");
      onClose();
    } catch (error) {
      console.error("Failed to save gallery:", error);
      toast.error("Error saving gallery.");
    } finally {
      setLoading(false);
    }
  };

  const handleDetach = async () => {
    if (!onDetachGallery) return;
    console.log("🔄 Detach gallery called from modal");
    try {
      setDetaching(true);
      await onDetachGallery();
      toast.success("Gallery detached successfully.");
      console.log("✅ Gallery detached successfully from modal");
      onClose();
    } catch (error) {
      console.error("❌ Failed to detach gallery:", error);
      toast.error(`Error detaching gallery: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setDetaching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-[350px] shadow-lg dark:bg-gray-900 dark:text-white">
        <h2 className="text-lg font-semibold mb-4">
          {existingGallery ? `Edit Gallery ${existingGallery.name}` : "Add Gallery"}
        </h2>
        <input
          type="text"
          className="w-full border px-3 py-2 rounded mb-3 dark:bg-gray-800 dark:border-gray-600"
          placeholder="Gallery Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="number"
          className="w-full border px-3 py-2 rounded mb-4 dark:bg-gray-800 dark:border-gray-600"
          placeholder="Capacity"
          value={capacity}
          onChange={(e) => setCapacity(Number(e.target.value))}
        />
        <div className="flex justify-between gap-2">
          <button
            onClick={onClose}
            className="px-3 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 dark:bg-gray-700 dark:text-white"
            disabled={loading || detaching}
          >
            Cancel
          </button>
          {existingGallery && onDetachGallery && (
            <button
              onClick={handleDetach}
              className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              disabled={loading || detaching}
            >
              {detaching ? "Detaching..." : "Detach"}
            </button>
          )}
          <button
            onClick={handleSave}
            className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            disabled={loading || detaching}
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
