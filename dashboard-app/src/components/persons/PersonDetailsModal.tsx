"use client";
import { Modal } from "@/components/ui/modal";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import Select from "@/components/form/Select";
import PhoneInput from "@/components/form/group-input/PhoneInput";
import { useEffect, useState } from "react";
import { apiPersons as api } from "@/lib";
import { toast } from "react-toastify";

interface Option {
  label: string;
  value: string;
}

interface PersonDetailsModalProps {
  open: boolean;
  onClose: () => void;
  onPersonUpdated: () => void;
  person: any;
}

const positions: Option[] = ["Miner", "Supervisor", "Engineer", "Safety Officer"].map(v => ({ label: v, value: v }));
const departments: Option[] = ["Excavation", "Safety", "Logistics", "Engineering"].map(v => ({ label: v, value: v }));
const statuses: Option[] = ["Active", "Inactive"].map(v => ({ label: v, value: v }));

export default function PersonDetailsModal({
  open,
  onClose,
  onPersonUpdated,
  person
}: PersonDetailsModalProps) {
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ ...person });
  const [supervisors, setSupervisors] = useState<Option[]>([]);

  useEffect(() => {
    if (!open) {
      setForm({});
      setEditMode(false);
    } else {
      setForm({ ...person });
      api.get("/persons").then(res => {
        const options = res.data.map((p: any) => ({
          label: `${p.name} ${p.surname}`,
          value: `${p.name} ${p.surname}`,
        }));
        setSupervisors(options);
      });
    }
  }, [open, person]);

  const update = (field: string, value: string) => {
    setForm((prev: typeof form) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      await api.put(`/persons/${person.id}`, {
        ...form,
        level: parseFloat(form.level),
      });
      toast.success("Person updated successfully!");
      onPersonUpdated();
      onClose();
    } catch (err) {
      toast.error("Failed to update person");
      console.error("Failed to update person", err);
    }
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this person?")) {
      try {
        await api.delete(`/persons/${person.id}`);
        toast.success("Person deleted");
        onPersonUpdated();
        onClose();
      } catch (err: any) {
        onClose();

        const raw = err?.response?.data;
        const msg =
          typeof raw === "string"
            ? raw
            : typeof raw?.message === "string"
            ? raw.message
            : "";

        if (msg.includes("user_person")) {
          toast.error("Cannot delete: This person is still linked to a user.");
        } else {
          toast.error("Delete failed. Try again or check logs.");
        }

        if (process.env.NODE_ENV === "development") {
          console.warn("Full delete error:", err);
        }
      }
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} className="max-w-[700px] m-4">
      <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
        <div className="px-2 pr-14">
          <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
            Person Details
          </h4>
        </div>

        <form className="flex flex-col">
          <div className="custom-scrollbar h-[400px] overflow-y-auto px-2 pb-3">
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
              <div><Label>Name</Label><Input type="text" value={form.name || ""} onChange={(e) => update("name", e.target.value)} disabled={!editMode} /></div>
              <div><Label>Surname</Label><Input type="text" value={form.surname || ""} onChange={(e) => update("surname", e.target.value)} disabled={!editMode} /></div>

              <div>
                <Label>Position</Label>
                {!editMode ? (
                  <p className="h-11 flex items-center px-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-white/80">{form.position}</p>
                ) : (
                  <Select options={positions} value={form.position} onChange={(val) => update("position", val)} />
                )}
              </div>

              <div>
                <Label>Department</Label>
                {!editMode ? (
                  <p className="h-11 flex items-center px-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-white/80">{form.department}</p>
                ) : (
                  <Select options={departments} value={form.department} onChange={(val) => update("department", val)} />
                )}
              </div>

              <div className="lg:col-span-2">
                <Label>Contact</Label>
                {!editMode ? (
                  <Input type="text" value={form.contact || ""} disabled />
                ) : (
                  <PhoneInput
                    value={form.contact}
                    placeholder="+90 (555) 444 22 33"
                    onChange={(val) => update("contact", val)}
                  />
                )}
              </div>

              <div>
                <Label>Status</Label>
                {!editMode ? (
                  <p className="h-11 flex items-center px-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-white/80">{form.status}</p>
                ) : (
                  <Select options={statuses} value={form.status} onChange={(val) => update("status", val)} />
                )}
              </div>

              <div>
                <Label>Level</Label>
                <Input type="number" value={form.level || ""} onChange={(e) => update("level", e.target.value)} disabled={!editMode} />
              </div>

              <div className="lg:col-span-2">
                <Label>Supervisor</Label>
                {!editMode ? (
                  <p className="h-11 flex items-center px-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-white/80">{form.supervisor}</p>
                ) : (
                  <Select options={supervisors} value={form.supervisor} onChange={(val) => update("supervisor", val)} />
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
            <Button type="button" size="sm" variant="outline" className="text-red-600 border-red-600 hover:bg-red-50" onClick={handleDelete}>Delete</Button>
            {!editMode ? (
              <Button size="sm" type="button" onClick={() => setEditMode(true)}>Edit</Button>
            ) : (
              <Button type="button" size="sm" onClick={handleSave}>Save</Button>
            )}
          </div>
        </form>
      </div>
    </Modal>
  );
}
