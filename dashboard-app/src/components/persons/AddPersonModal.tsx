"use client";
import { Modal } from "@/components/ui/modal";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { useState, useEffect } from "react";
import api from "@/lib/axiosPersons";
import PhoneInput from "@/components/form/group-input/PhoneInput";
import Select from "@/components/form/Select";

interface Option {
  value: string;
  label: string;
}

interface AddPersonModalProps {
  open: boolean;
  onClose: () => void;
  onPersonAdded: () => void;
}

const positions: Option[] = ["Miner", "Supervisor", "Engineer", "Safety Officer"].map(v => ({ label: v, value: v }));
const departments: Option[] = ["Excavation", "Safety", "Logistics", "Engineering"].map(v => ({ label: v, value: v }));
const statuses: Option[] = ["Active", "Inactive"].map(v => ({ label: v, value: v }));

export default function AddPersonModal({ open, onClose, onPersonAdded }: AddPersonModalProps) {
  const [form, setForm] = useState({
    name: "",
    surname: "",
    position: "",
    department: "",
    contact: "",
    status: "",
    level: "",
    supervisor: "",
  });

  const [supervisors, setSupervisors] = useState<Option[]>([]);

  useEffect(() => {
    if (open) {
      api.get("/persons").then(res => {
        const names = res.data.map((p: any) => ({
          label: `${p.name} ${p.surname}`,
          value: `${p.name} ${p.surname}`,
        }));
        setSupervisors(names);
      });
    }
  }, [open]);

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      await api.post("/persons", {
        ...form,
        level: parseFloat(form.level),
      });
      onPersonAdded();
      onClose();
    } catch (err) {
      console.error("Failed to add person:", err);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} className="max-w-[700px] m-4">
      <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
        <div className="px-2 pr-14">
          <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
            Add New Person
          </h4>
        </div>

        <form className="flex flex-col">
          <div className="custom-scrollbar h-[400px] overflow-y-auto px-2 pb-3">
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
              <div><Label>Name</Label><Input type="text" value={form.name} onChange={(e) => update("name", e.target.value)} /></div>
              <div><Label>Surname</Label><Input type="text" value={form.surname} onChange={(e) => update("surname", e.target.value)} /></div>
              <div><Label>Position</Label><Select options={positions} value={form.position} onChange={(val) => update("position", val)} /></div>
              <div><Label>Department</Label><Select options={departments} value={form.department} onChange={(val) => update("department", val)} /></div>
              <div className="lg:col-span-2">
                <Label>Contact (Phone)</Label>
                <PhoneInput
                  placeholder="+90 (555) 444 22 33"
                  onChange={(value) => update("contact", value)}
                />
              </div>
              <div><Label>Status</Label><Select options={statuses} value={form.status} onChange={(val) => update("status", val)} /></div>
              <div><Label>Level</Label><Input type="number" value={form.level} onChange={(e) => update("level", e.target.value)} /></div>
              <div className="lg:col-span-2">
                <Label>Supervisor</Label>
                <Select options={supervisors} value={form.supervisor} onChange={(val) => update("supervisor", val)} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
            <Button size="sm" variant="outline" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSave}>Add Person</Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
