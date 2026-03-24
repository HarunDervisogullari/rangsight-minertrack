"use client";
import { Modal } from "@/components/ui/modal";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import Select from "@/components/form/Select";
import { useEffect, useState } from "react";
import { apiDevices, apiGalleries, apiPersons } from "@/lib";
import { toast } from "react-toastify";
import { X } from "lucide-react";

interface Device {
  id: number;
  label: string;
  type: string;
  owned: string;
  barcode: string;
  isOn: boolean;
}

interface DeviceDetailsModalProps {
  open: boolean;
  onClose: () => void;
  onDeviceUpdated: () => void;
  device: Device;
}

export default function DeviceDetailsModal({
  open,
  onClose,
  onDeviceUpdated,
  device,
}: DeviceDetailsModalProps) {
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ ...device });
  const [assignedPersonId, setAssignedPersonId] = useState<number | null>(null);
  const [shouldUnassign, setShouldUnassign] = useState(false);
  const [shouldDetach, setShouldDetach] = useState(false);

  const [galleryOptions, setGalleryOptions] = useState<{ label: string; value: string }[]>([]);
  const [persons, setPersons] = useState<{ label: string; value: string; id: number }[]>([]);

  const helmetLabels = ["Helmet Alpha", "Helmet Beta", "Helmet Gamma"].map((v) => ({ label: v, value: v }));
  const hotspotLabels = ["Hotspot A1", "Hotspot B2", "Hotspot C3"].map((v) => ({ label: v, value: v }));

  useEffect(() => {
    if (!open) {
      setForm({} as Device);
      setEditMode(false);
      setAssignedPersonId(null);
      setShouldUnassign(false);
      setShouldDetach(false);
    } else {
      setForm({ ...device });

      if (device.type === "Helmet") {
        fetchAssignment();
        apiPersons.get("/persons").then((res) => {
          const options = [
            { label: "Unassigned", value: "Unassigned", id: -1 },
            ...res.data.map((p: any) => ({
              label: `${p.name} ${p.surname}`,
              value: `${p.name} ${p.surname}`,
              id: p.id,
            }))
          ];
          setPersons(options);
        });
      }

      if (device.type === "Hotspot") {
        apiGalleries.get("/galleries").then((res) => {
          const options = [
            { label: "Unassigned", value: "Unassigned" },
            ...res.data.map((g: any) => ({
              label: g.name,
              value: g.name,
            }))
          ];
          setGalleryOptions(options);
        });
      }
    }
  }, [open, device]);

  const fetchAssignment = async () => {
    try {
      const res = await apiDevices.get("/person-device");
      const match = res.data.find((pd: any) => pd.id.deviceId === device.id);
      setAssignedPersonId(match ? match.id.personId : null);
    } catch (err) {
      console.error("Failed to fetch assignments", err);
      setAssignedPersonId(null);
    }
  };

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      const updatedDevice = { ...form };
  
      // 1. If Detach is triggered
      if (updatedDevice.type === "Hotspot" && shouldDetach) {
        await apiDevices.post(`/devices/hotspot-gallery/detach/${device.id}`);
        toast.success("Hotspot detached and cleaned.");
        setShouldDetach(false);
      }
  
      // 2. Save Device update
      await apiDevices.put(`/devices/${device.id}`, updatedDevice);
  
      // 3. If reassigned to new gallery (not Unassigned)
      if (updatedDevice.type === "Hotspot" && updatedDevice.owned !== "Unassigned") {
        await apiDevices.post(`/devices/hotspots/reassign-gallery/${device.id}`, {
          gallery: updatedDevice.owned
        });
        toast.success("Hotspot reassigned to new gallery.");
      }
  
      await fetchAssignment();
      toast.success("Device updated");
      onDeviceUpdated();
      onClose();
    } catch (err) {
      toast.error("Update failed");
      console.error(err);
    }
  };
  

  const handleDelete = async () => {
    await fetchAssignment();
    if (assignedPersonId && device.type === "Helmet") {
      toast.error("Unassign the Helmet first before deleting.");
      return;
    }

    if (confirm("Are you sure you want to delete this device?")) {
      try {
        await apiDevices.delete(`/devices/${device.id}`);
        toast.success("Device deleted");
        onDeviceUpdated();
        onClose();
      } catch (err) {
        toast.error("Delete failed.");
        console.error(err);
      }
    }
  };

  const handleUnassign = () => {
    setForm(prev => ({ ...prev, owned: "Unassigned" }));
    setShouldUnassign(true);
    setEditMode(true);
    toast.info("Helmet unassigned — don’t forget to Save.");
  };

  const handleDetach = () => {
    setForm(prev => ({ ...prev, owned: "Unassigned" }));
    setShouldDetach(true);
    setEditMode(true);
    toast.info("Hotspot detached — don’t forget to Save.");
  };

  return (
    <Modal isOpen={open} onClose={onClose} className="max-w-[700px] m-4">
      <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
        <div className="flex items-center justify-between px-2 pr-14">
          <h4 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
            Device Details
          </h4>
        </div>
        <form className="flex flex-col">
          <div className="custom-scrollbar h-[400px] overflow-y-auto px-2 pb-3">
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
              <div>
                <Label>Label</Label>
                {editMode ? (
                  <Select
                    options={device.type === "Helmet" ? helmetLabels : hotspotLabels}
                    value={form.label}
                    onChange={(val) => update("label", val)}
                  />
                ) : (
                  <Input
                    type="text"
                    value={form.label || ""}
                    onChange={(e) => update("label", e.target.value)}
                    disabled
                  />
                )}
              </div>

              <div>
                <Label>{device.type === "Hotspot" ? "Gallery" : "Owned By"}</Label>
                <div className="relative">
                  {device.type === "Helmet" && editMode ? (
                    <Select
                      options={persons}
                      value={form.owned}
                      onChange={(val) => update("owned", val)}
                    />
                  ) : device.type === "Hotspot" && editMode ? (
                    <Select
                      options={galleryOptions}
                      value={form.owned}
                      onChange={(val) => update("owned", val)}
                    />
                  ) : (
                    <Input
                      type="text"
                      value={form.owned || ""}
                      onChange={(e) => update("owned", e.target.value)}
                      disabled
                      className="pr-10"
                    />
                  )}

                  {device.type === "Helmet" && assignedPersonId && !editMode && form.owned !== "Unassigned" && (
                    <button
                      type="button"
                      onClick={handleUnassign}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-red-500 hover:text-red-700"
                      title="Unassign Helmet"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}

                  {device.type === "Hotspot" && !editMode && form.owned !== "Unassigned" && (
                    <button
                      type="button"
                      onClick={handleDetach}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-red-500 hover:text-red-700"
                      title="Detach Hotspot"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <Label>Type</Label>
                <p className="flex h-11 items-center rounded-lg bg-gray-100 px-3 text-gray-700 dark:bg-gray-800 dark:text-white/80">
                  {form.type}
                </p>
              </div>

              {(form.type === "Helmet" || form.type === "Hotspot") && (
                <div>
                  <Label>Barcode</Label>
                  <Input
                    type="text"
                    value={form.barcode || ""}
                    onChange={(e) => update("barcode", e.target.value)}
                    disabled={!editMode}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3 px-2 lg:justify-end">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-red-600 text-red-600 hover:bg-red-50"
              onClick={handleDelete}
            >
              Delete
            </Button>
            {!editMode ? (
              <Button size="sm" type="button" onClick={() => setEditMode(true)}>
                Edit
              </Button>
            ) : (
              <Button type="button" size="sm" onClick={handleSave}>
                Save
              </Button>
            )}
          </div>
        </form>
      </div>
    </Modal>
  );
}
