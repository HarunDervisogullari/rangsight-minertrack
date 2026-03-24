"use client";
import { Modal } from "@/components/ui/modal";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import Select from "@/components/form/Select";
import { useEffect, useState } from "react";
import { apiDevices, apiGallery, apiPersons } from "@/lib";
import { toast } from "react-toastify";

interface AddDeviceModalProps {
  open: boolean;
  onClose: () => void;
  onDeviceAdded: () => void;
  editMode?: boolean;
  existingDevice?: any;
}

export default function AddDeviceModal({ open, onClose, onDeviceAdded, editMode = false, existingDevice }: AddDeviceModalProps) {
  const [form, setForm] = useState({
    type: "",
    label: "",
    owned: "",
    barcode: "",
    assignedTo: "",
    gallery: "",
  });

  const [persons, setPersons] = useState<{ label: string; value: string; id: number }[]>([]);
  const [galleryOptions, setGalleryOptions] = useState<{ label: string; value: string; id: number }[]>([]);

  const helmetLabels = ["Helmet Alpha", "Helmet Beta", "Helmet Gamma"].map(l => ({ label: l, value: l }));
  const hotspotLabels = ["Hotspot A1", "Hotspot B2", "Hotspot C3"].map(l => ({ label: l, value: l }));

  // Populate form if editing
  useEffect(() => {
    if (editMode && existingDevice) {
      setForm({
        type: existingDevice.type,
        label: existingDevice.label,
        owned: existingDevice.owned,
        barcode: existingDevice.barcode,
        assignedTo: "",
        gallery: "",
      });
    }
  }, [editMode, existingDevice]);

  // Fetch persons for Helmet
  useEffect(() => {
    if (form.type === "Helmet") {
      apiPersons.get("/persons").then((res) => {
        const options = [
          { label: "Unassigned", value: "" },
          ...res.data.map((p: any) => ({
            label: `${p.name} ${p.surname}`,
            value: p.id.toString(),
            id: p.id,
          }))
        ];
        setPersons(options);
      });
    }
  }, [form.type]);

  // Fetch galleries for Hotspot
  useEffect(() => {
    if (form.type === "Hotspot") {
      apiGallery.get("/galleries")
        .then((res) => {
          const options = res.data.map((g: any) => ({
            label: g.name,
            value: g.id.toString(),
            id: g.id,
          }));
          setGalleryOptions(options);
        })
        .catch((err) => console.error("Failed to fetch galleries:", err));
    }
  }, [form.type]);

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      if (editMode) {
        await apiDevices.put(`/devices/${existingDevice.id}`, {
          label: form.label,
          type: form.type,
          barcode: form.barcode,
          owned: form.type === "Helmet"
            ? persons.find(p => p.value === form.assignedTo)?.label ?? ""
            : galleryOptions.find(g => g.value === form.gallery)?.label ?? "",
          isOn: true,
        });
        toast.success("Device updated successfully!");
      } else {
        await apiDevices.post("/devices", {
          label: form.label,
          type: form.type,
          barcode: form.barcode,
          owned: form.type === "Helmet"
            ? persons.find(p => p.value === form.assignedTo)?.label ?? ""
            : galleryOptions.find(g => g.value === form.gallery)?.label ?? "",
          isOn: true,
        });
        toast.success("Device added successfully!");
      }
  
      onDeviceAdded();
      onClose();
    } catch (err) {
      toast.error("Failed to save device");
      console.error(err);
    }
  };

  const handleDetachHotspot = async () => {
    try {
      await apiDevices.post(`/hotspot-gallery/detach/${existingDevice.id}`);
      toast.success("Hotspot detached from gallery");
      onDeviceAdded();
      onClose();
    } catch (err) {
      toast.error("Failed to detach hotspot");
      console.error(err);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} className="max-w-[700px] m-4">
      <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
        <div className="px-2 pr-14">
          <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
            {editMode ? "Edit Device" : "Add New Device"}
          </h4>
        </div>
        <form className="flex flex-col">
          <div className="custom-scrollbar h-[400px] overflow-y-auto px-2 pb-3">
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
              <div><Label>Type</Label>
                <Select
                  options={[{ label: "Helmet", value: "Helmet" }, { label: "Hotspot", value: "Hotspot" }]}
                  value={form.type}
                  onChange={(val) => update("type", val)}
                />
              </div>
              {form.type === "Helmet" && (
                <>
                  <div><Label>Label</Label><Select options={helmetLabels} value={form.label} onChange={(val) => update("label", val)} /></div>
                  <div><Label>Assign To</Label><Select options={persons} value={form.assignedTo} onChange={(val) => update("assignedTo", val)} /></div>
                  <div><Label>Barcode</Label><Input type="text" value={form.barcode} onChange={(e) => update("barcode", e.target.value)} /></div>
                </>
              )}
              {form.type === "Hotspot" && (
                <>
                  <div><Label>Label</Label><Select options={hotspotLabels} value={form.label} onChange={(val) => update("label", val)} /></div>
                  <div><Label>Gallery</Label><Select options={galleryOptions} value={form.gallery} onChange={(val) => update("gallery", val)} /></div>
                  <div><Label>Barcode</Label><Input type="text" value={form.barcode} onChange={(e) => update("barcode", e.target.value)} /></div>
                  {editMode && (
                    <div className="col-span-2">
                      <Button variant="outline" onClick={handleDetachHotspot}>Detach Hotspot</Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
            <Button size="sm" variant="outline" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSave}>{editMode ? "Save Changes" : "Add Device"}</Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
