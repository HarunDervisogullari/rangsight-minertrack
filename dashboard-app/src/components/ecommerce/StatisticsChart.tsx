"use client";
import { useEffect, useState } from "react";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { apiGalleries } from "@/lib";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

type Gallery = {
  id: number;
  name: string;
  capacity: number;
};

type GalleryWithCrowd = Gallery & { crowd: number; density: number };

export default function StatisticsChart() {
  const [galleries, setGalleries] = useState<GalleryWithCrowd[]>([]);
  const [topCount, setTopCount] = useState<number>(5);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiGalleries.get("/galleries");
        const data: Gallery[] = response.data;

        // Inject synthetic crowd and density
        const withCrowd: GalleryWithCrowd[] = data.map((g) => {
          const crowd = Math.floor(Math.random() * 50);
          const density = g.capacity > 0 ? crowd / g.capacity : 0;
          return { ...g, crowd, density };
        });

        setGalleries(withCrowd);
      } catch (err) {
        console.error("Failed to fetch galleries", err);
      }
    };
    fetchData();
  }, []);

  // Order by density before slicing
  const topGalleries = [...galleries]
    .sort((a, b) => b.density - a.density)
    .slice(0, topCount);

  const categories = topGalleries.map((g) => g.name);
  const capacityData = topGalleries.map((g) => g.capacity);
  const crowdData = topGalleries.map((g) => g.crowd);

  const series = [
    {
      name: "Capacity",
      data: topGalleries.map((g) => ({ x: g.name, y: g.capacity })),
    },
    {
      name: "Crowd",
      data: topGalleries.map((g) => ({ x: g.name, y: g.crowd })),
    },
  ];
  

  const options: ApexOptions = {
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "left",
    },
    colors: ["#465FFF", "#9CB9FF"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      height: 310,
      type: "line",
      toolbar: { show: false },
    },
    stroke: {
      curve: "straight",
      width: [2, 2],
    },
    fill: {
      type: "gradient",
      gradient: {
        opacityFrom: 0.55,
        opacityTo: 0,
      },
    },
    markers: {
      size: 0,
      strokeColors: "#fff",
      strokeWidth: 2,
      hover: { size: 6 },
    },
    grid: {
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
    },
    dataLabels: { enabled: false },
    tooltip: {
      enabled: true,
      custom: function ({ series, dataPointIndex, w }) {
        const seriesNames: string[] = w.config.series.map((s: any) => s.name);
        const name = w.globals.initialSeries[0].data[dataPointIndex]?.x || "N/A";

    
        return `
          <div style="padding: 8px; background: #1f2937; color: white; border-radius: 8px; font-size: 13px;">
            <div style="font-weight: 600; margin-bottom: 6px;">${name}</div>
            ${seriesNames
              .map((label: string, i: number) => {
                const val = series[i][dataPointIndex];
                const colorDot = w.config.colors?.[i] || "#000";
                return `
                  <div style="display: flex; align-items: center; margin: 2px 0;">
                    <span style="width: 10px; height: 10px; background: ${colorDot}; border-radius: 50%; display: inline-block; margin-right: 8px;"></span>
                    <span>${label}: ${val}</span>
                  </div>`;
              })
              .join("")}
          </div>
        `;
      },
    },
    
    
    xaxis: {
      type: "category",
      categories: categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false },
    },
    yaxis: {
      labels: {
        style: {
          fontSize: "12px",
          colors: ["#6B7280"],
        },
      },
      title: {
        text: "",
        style: { fontSize: "0px" },
      },
    },
    
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex flex-col gap-5 mb-6 sm:flex-row sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Gallery Capacities vs Crowd
          </h3>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            Ranked by density (crowd ÷ capacity)
          </p>
        </div>

        <div className="flex gap-2 mt-2 sm:mt-0">
          {[5, 10, 15].map((count) => (
            <button
              key={count}
              className={`px-3 py-1 text-sm font-medium rounded-md border border-gray-600 ${
                topCount === count
                  ? "bg-blue-500 text-white"
                  : "bg-transparent border-gray-300 text-gray-700 dark:text-gray-300"
              }`}
              onClick={() => setTopCount(count)}
            >
              Top {count}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <div className="min-w-[1000px] xl:min-w-full">
          <ReactApexChart
            options={options}
            series={series}
            type="area"
            height={310}
          />
        </div>
      </div>
    </div>
  );
}
