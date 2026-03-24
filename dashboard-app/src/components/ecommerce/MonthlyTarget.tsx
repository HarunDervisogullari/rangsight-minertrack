"use client";

import { useEffect, useState } from "react";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { Dropdown } from "../ui/dropdown/Dropdown";
// import { MoreDotIcon } from "@/icons";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { apiGalleries } from "@/lib";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

export default function MonthlyTarget() {
  const [totalWorkers, setTotalWorkers] = useState<number>(0);
  const [totalCapacity, setTotalCapacity] = useState<number>(0);
  const [fillPercentage, setFillPercentage] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchGalleries = async () => {
      try {
        const response = await apiGalleries.get("/galleries");
        const data = response.data;
        const galleries = data.map((g: any) => {
          const crowd = Math.floor(Math.random() * 50); // synthetic crowd
          const fillPercent = g.capacity > 0 ? (crowd / g.capacity) * 100 : 0;
          return { ...g, crowd, fillPercent };
        });

        const totalCap = galleries.reduce((acc: number, g: any) => acc + g.capacity, 0);
        const totalWork = galleries.reduce((acc: number, g: any) => acc + g.crowd, 0);
        const percent = totalCap > 0 ? (totalWork / totalCap) * 100 : 0;

        setTotalWorkers(totalWork);
        setTotalCapacity(totalCap);
        setFillPercentage(parseFloat(percent.toFixed(2)));
      } catch (err) {
        console.error("Failed to fetch gallery data", err);
      }
    };

    fetchGalleries();
  }, []);

  const series = [fillPercentage];
  const options: ApexOptions = {
    colors: ["#465FFF"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "radialBar",
      height: 330,
      sparkline: { enabled: true },
    },
    plotOptions: {
      radialBar: {
        startAngle: -85,
        endAngle: 85,
        hollow: { size: "80%" },
        track: { background: "#E4E7EC", strokeWidth: "100%", margin: 5 },
        dataLabels: {
          name: { show: false },
          value: {
            fontSize: "36px",
            fontWeight: "600",
            offsetY: -40,
            color: "#1D2939",
            formatter: (val) => `${val.toFixed(2)}%`,
          },
        },
      },
    },
    fill: { type: "solid", colors: ["#465FFF"] },
    stroke: { lineCap: "round" },
    labels: ["Occupancy"],
  };

  function toggleDropdown() {
    setIsOpen(!isOpen);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-white/[0.03] min-h-[460px]">
      <div className="px-5 pt-5 bg-white shadow-default rounded-2xl pb-11 dark:bg-gray-900 sm:px-6 sm:pt-6 min-h-[460px]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex flex-col justify-center">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Capacity Utilization
            </h3>
            <p className="mt-1 pb-[50px] font-normal text-gray-500 text-theme-sm dark:text-gray-400">
  Current worker occupancy across all galleries
</p>
          </div>
          <div className="relative inline-block self-start sm:self-center">


          </div>
        </div>

        <div className="relative">
          <div className="max-h-[330px]">
            <ReactApexChart
              options={options}
              series={series}
              type="radialBar"
              height={330}
            />
          </div>
          <span className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-[95%] rounded-full bg-success-50 px-3 py-1 text-xs font-medium text-success-600 dark:bg-success-500/15 dark:text-success-500">
            +{(fillPercentage - 65).toFixed(1)}%
          </span>
        </div>

        <p className="mx-auto mt-10 w-full max-w-[380px] text-center text-sm text-gray-500 sm:text-base">
          Currently <b>{totalWorkers}</b> workers in galleries with a total capacity of{" "}
          <b>{totalCapacity}</b>. Utilization rate is <b>{fillPercentage}%</b>.
        </p>
      </div>
    </div>
  );
}
