"use client";

import { useEffect, useState } from "react";
import EcommerceMetrics from "@/components/ecommerce/EcommerceMetrics";
import MonthlyTarget from "@/components/ecommerce/MonthlyTarget";
import MonthlySalesChart from "@/components/ecommerce/MonthlySalesChart";
import StatisticsChart from "@/components/ecommerce/StatisticsChart";
import RecentOrders from "@/components/ecommerce/RecentOrders";
import DemographicCard from "@/components/ecommerce/DemographicCard";
import { Card, CardContent } from "@/components/ui/card";
import { apiGalleries } from "@/lib";

type Gallery = {
  id: number;
  name: string;
  location: string;
  level: number;
};

export default function EcommerceClientPage() {
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [selectedGallery, setSelectedGallery] = useState<string>("");

  useEffect(() => {
    const fetchGalleries = async () => {
      try {
        const response = await apiGalleries.get("/galleries");
        const data = response.data;
        const sorted = [...data].sort((a, b) => {
            const numA = parseInt(a.name.match(/\d+/)?.[0] || "0", 10);
            const numB = parseInt(b.name.match(/\d+/)?.[0] || "0", 10);
            return numA - numB;
          });
        setGalleries(sorted);
        if (sorted.length > 0) {
          setSelectedGallery(sorted[0].name);
        }
      } catch (error) {
        console.error("Failed to fetch galleries:", error);
      }
    };

    fetchGalleries();
  }, []);

  return (
    <div className="grid grid-cols-12 gap-1 md:gap-6">
      {/* Gallery Monitoring (kept lightweight to match original styling) */}
      <div className="col-span-12 space-y-6 xl:col-span-7">
      <Card className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 px-5 pt-5 sm:px-6 sm:pt-6 ">
          <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
  <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
    Gallery Monitoring
  </h2>
  <select
    className="mt-2 sm:mt-0 rounded-md border border-gray-600 px-3 py-1 text-sm bg-white text-gray-900 dark:bg-gray-800 dark:text-white"
    value={selectedGallery}
    onChange={(e) => setSelectedGallery(e.target.value)}
  >
    {galleries.map((gallery) => (
      <option key={gallery.id} value={gallery.name}>
        {gallery.name}
      </option>
    ))}
  </select>
</div>
            {selectedGallery && <EcommerceMetrics gallery={selectedGallery} />}
          </CardContent>
        </Card>

        <MonthlySalesChart />
      </div>

      <div className="col-span-12 xl:col-span-5">
        <MonthlyTarget />
      </div>

      <div className="col-span-12">
        <StatisticsChart />
      </div>

      <div className="col-span-12 xl:col-span-5">
        <DemographicCard />
      </div>

      <div className="col-span-12 xl:col-span-7">
        <RecentOrders />
      </div>
    </div>
  );
}
