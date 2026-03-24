"use client";
import { useEffect, useState } from "react";
import Button from "@/components/ui/button/Button";
import AddDeviceModal from "./AddDeviceModal";
import DeviceDetailsModal from "./DeviceDetailsModal";
import api from "@/lib/axiosDevices";

type Device = {
  id: number;
  label: string;
  type: string;
  owned: string;
  barcode: string;
  isOn: boolean;
};

export default function DeviceList() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [filtered, setFiltered] = useState<Device[]>([]);
  const [filter, setFilter] = useState({
    label: "",
    type: "",
    owned: "",
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const fetchDevices = () => {
    api.get("/devices").then((res) => {
      setDevices(res.data);
      setFiltered(res.data);
    });
  };

  useEffect(() => {
    api.get("/devices").then((res) => {
      setDevices(res.data);
    });
  }, []);

  useEffect(() => {
    const result = devices.filter(device => {
      return (
        (filter.label === "" || device.label.toLowerCase().includes(filter.label.toLowerCase())) &&
        (filter.owned === "" || device.owned.toLowerCase().includes(filter.owned.toLowerCase())) &&
        (filter.type === "" || device.type.toLowerCase() === filter.type.toLowerCase())
      );
    });
    setFiltered(result);
  }, [filter, devices]);

  const handleCloseModal = () => {
    setShowDetailsModal(false);
    setSelectedDevice(null);
  };

  return (
    <div className="p-6 space-y-6 bg-white dark:bg-gray-900">
      <div className="flex flex-wrap gap-4">
        <input
          className="border px-3 py-2 rounded text-gray-800 dark:text-white dark:bg-gray-800 dark:border-gray-700"
          placeholder="Label"
          value={filter.label}
          onChange={(e) => setFilter({ ...filter, label: e.target.value })}
        />
        <input
          className="border px-3 py-2 rounded text-gray-800 dark:text-white dark:bg-gray-800 dark:border-gray-700"
          placeholder="Owned by"
          value={filter.owned}
          onChange={(e) => setFilter({ ...filter, owned: e.target.value })}
        />
        <select
          className="border px-3 py-2 rounded text-gray-800 dark:text-white dark:bg-gray-800 dark:border-gray-700"
          value={filter.type}
          onChange={(e) => setFilter({ ...filter, type: e.target.value })}
        >
          <option value="">Type</option>
          <option value="helmet">Helmet</option>
          <option value="hotspot">Hotspot</option>
        </select>
        <div className="ml-auto">
          <Button onClick={() => setIsModalOpen(true)}>Add Device</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((device) => (
          <div
            key={device.id}
            onClick={() => {
              setSelectedDevice(device);
              setShowDetailsModal(true);
            }}
            className="cursor-pointer border rounded-xl shadow p-4 bg-white dark:bg-gray-800 hover:ring-2 ring-blue-500"
          >
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">
              {device.label}
            </h2>
            <p className="text-gray-600 dark:text-gray-300"><strong>Type:</strong> {device.type}</p>
            <p className="text-gray-600 dark:text-gray-300"><strong>Owned:</strong> {device.owned}</p>
            <p className="text-gray-600 dark:text-gray-300"><strong>MAC:</strong> {device.barcode}</p>
          </div>
        ))}
      </div>

      <AddDeviceModal open={isModalOpen} onClose={() => setIsModalOpen(false)} onDeviceAdded={fetchDevices} />

      {selectedDevice && (
        <DeviceDetailsModal
          device={selectedDevice}
          open={showDetailsModal}
          onClose={handleCloseModal}
          onDeviceUpdated={fetchDevices}
        />
      )}
    </div>
  );
}
