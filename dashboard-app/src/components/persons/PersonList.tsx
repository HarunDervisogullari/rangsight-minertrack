"use client";
import { useEffect, useState } from "react";
import Button from "@/components/ui/button/Button";
import AddPersonModal from "./AddPersonModal";
import PersonDetailsModal from "./PersonDetailsModal";
import api from "@/lib/axiosPersons";

type Person = {
  id: number;
  name: string;
  surname: string;
  position: string;
  department: string;
  contact: string;
  status: string;
  location: string;
  level: number;
  supervisor: string;
};

export default function PersonList() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [filtered, setFiltered] = useState<Person[]>([]);
  const [filter, setFilter] = useState({
    name: "",
    surname: "",
    position: "",
    department: "",
    status: ""
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const fetchPersons = () => {
    api.get("/persons").then((res) => {
      setPersons(res.data);
      setFiltered(res.data);
    });
  };

  useEffect(() => {
    fetchPersons();
  }, []);

  useEffect(() => {
    const result = persons.filter(person => {
      return (
        (filter.name === "" || person.name.toLowerCase().includes(filter.name.toLowerCase())) &&
        (filter.surname === "" || person.surname.toLowerCase().includes(filter.surname.toLowerCase())) &&
        (filter.position === "" || person.position.toLowerCase().includes(filter.position.toLowerCase())) &&
        (filter.department === "" || person.department.toLowerCase().includes(filter.department.toLowerCase())) &&
        (filter.status === "" || person.status.toLowerCase() === filter.status.toLowerCase())
      );
    });
    setFiltered(result);
  }, [filter, persons]);

  const handleCloseModal = () => {
    setShowDetailsModal(false);
    setSelectedPerson(null);
  };

  return (
    <div className="p-6 space-y-6 bg-white dark:bg-gray-900">
      <div className="flex flex-wrap gap-4">
        <input
          className="border px-3 py-2 rounded text-gray-800 dark:text-white dark:bg-gray-800 dark:border-gray-700"
          placeholder="Name"
          value={filter.name}
          onChange={(e) => setFilter({ ...filter, name: e.target.value })}
        />
        <input
          className="border px-3 py-2 rounded text-gray-800 dark:text-white dark:bg-gray-800 dark:border-gray-700"
          placeholder="Surname"
          value={filter.surname}
          onChange={(e) => setFilter({ ...filter, surname: e.target.value })}
        />
        <input
          className="border px-3 py-2 rounded text-gray-800 dark:text-white dark:bg-gray-800 dark:border-gray-700"
          placeholder="Position"
          value={filter.position}
          onChange={(e) => setFilter({ ...filter, position: e.target.value })}
        />
        <input
          className="border px-3 py-2 rounded text-gray-800 dark:text-white dark:bg-gray-800 dark:border-gray-700"
          placeholder="Department"
          value={filter.department}
          onChange={(e) => setFilter({ ...filter, department: e.target.value })}
        />
        <select
          className="border px-3 py-2 rounded text-gray-800 dark:text-white dark:bg-gray-800 dark:border-gray-700"
          value={filter.status}
          onChange={(e) => setFilter({ ...filter, status: e.target.value })}
        >
          <option value="">Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
        <div className="ml-auto">
          <Button onClick={() => setIsModalOpen(true)}>Add Person</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((person) => (
          <div
            key={person.id}
            onClick={() => {
              setSelectedPerson(person);
              setShowDetailsModal(true);
            }}
            className="cursor-pointer border rounded-xl shadow p-4 bg-white dark:bg-gray-800 hover:ring-2 ring-blue-500"
          >
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">
              {person.name} {person.surname}
            </h2>
            <p className="text-gray-600 dark:text-gray-300"><strong>Position:</strong> {person.position}</p>
            <p className="text-gray-600 dark:text-gray-300"><strong>Department:</strong> {person.department}</p>
            <p>
              <strong className="text-gray-600 dark:text-gray-300">Status:</strong>{" "}
              <span className={person.status === "Active" ? "text-green-600" : "text-red-600"}>
                {person.status}
              </span>
            </p>
          </div>
        ))}
      </div>

      <AddPersonModal open={isModalOpen} onClose={() => setIsModalOpen(false)} onPersonAdded={fetchPersons} />

      {selectedPerson && (
        <PersonDetailsModal
          person={selectedPerson}
          open={showDetailsModal}
          onClose={handleCloseModal}
          onPersonUpdated={fetchPersons}
        />
      )}
    </div>
  );
}
