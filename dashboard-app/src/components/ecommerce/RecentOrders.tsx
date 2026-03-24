"use client";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Badge from "../ui/badge/Badge";
import Image from "next/image";
import { useEffect, useState } from "react";
import api from "@/lib/axiosPersons";

interface Person {
  id: number;
  name: string;
  surname: string;
  position: string;
  department: string;
  contact: string;
  status: string;
  level: number;
  supervisor: string;
}

export default function RecentOrders() {
  const [persons, setPersons] = useState<Person[]>([]);

  useEffect(() => {
    api.get("/persons").then((res) => {
      // Get top 6 persons by level
      const sortedPersons = [...res.data].sort((a, b) => b.level - a.level).slice(0, 7);
      setPersons(sortedPersons);
    });
  }, []);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="py-1.5">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Top Personnel
          </h3>
        </div>
        {/* <div className="flex items-center gap-3">
          <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200">
            Filter
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200">
            See all
          </button>
        </div> */}
        
      </div>
      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
            <TableRow>
              <TableCell isHeader className="py-3 text-start text-theme-xs text-gray-500 font-medium dark:text-gray-400">
                Personnel
              </TableCell>
              <TableCell isHeader className="py-3 text-start text-theme-xs text-gray-500 font-medium dark:text-gray-400">
                Position
              </TableCell>
              <TableCell isHeader className="py-3 text-start text-theme-xs text-gray-500 font-medium dark:text-gray-400">
                Department
              </TableCell>
              <TableCell isHeader className="py-3 text-start text-theme-xs text-gray-500 font-medium dark:text-gray-400">
                Status
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {persons.map((person) => (
              <TableRow key={person.id}>
                <TableCell className="py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-[50px] w-[50px] overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <span className="text-lg font-semibold text-gray-600 dark:text-gray-300">
                        {person.name[0]}{person.surname[0]}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                        {person.name} {person.surname}
                      </p>
                      <span className="text-gray-500 text-theme-xs dark:text-gray-400">
                        Level {person.level}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                  {person.position}
                </TableCell>
                <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                  {person.department}
                </TableCell>
                <TableCell className="py-3">
                  <Badge
                    size="sm"
                    color={person.status === "Active" ? "success" : "error"}
                  >
                    {person.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
