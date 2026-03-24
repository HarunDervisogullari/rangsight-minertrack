"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card"; // Adjust import if needed
import { apiGalleries } from "@/lib";

interface Metrics {
  oxygen: number;
  co2: number;
  otherGas: number;
  crowd: number;
}

export default function EcommerceMetrics({ gallery }: { gallery: string }) {
  const [metrics, setMetrics] = useState<Metrics>({ oxygen: 0, co2: 0, otherGas: 0, crowd: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [galleryId, setGalleryId] = useState<number | null>(null);

  // First useEffect: Get gallery ID from gallery name
  useEffect(() => {
    if (!gallery) return;

    const fetchGalleryId = async () => {
      try {
        const response = await apiGalleries.get(`/galleries/name/${gallery}`);
        setGalleryId(response.data.id);
      } catch (e) {
        if (e instanceof Error) {
          setError(`Failed to find gallery: ${e.message}`);
        } else {
          setError("Failed to find gallery");
        }
        setGalleryId(null);
      }
    };

    fetchGalleryId();
  }, [gallery]);

  // Second useEffect: Fetch environmental data using gallery ID
  useEffect(() => {
    if (!galleryId) return;

    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://127.0.0.1:8001/api/environment/gallery/${galleryId}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setMetrics({
          oxygen: data.oxygen || 0,
          co2: data.co2 || 0,
          otherGas: data.other_gas || 0,
          crowd: data.crowd_count || 0,
        });
        setError(null);
      } catch (e) {
        if (e instanceof Error) {
          setError(e.message);
        } else {
          setError("An unknown error occurred");
        }
        // Optionally, set metrics to default or last known good values
        setMetrics({ oxygen: 0, co2: 0, otherGas: 0, crowd: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics(); // Initial fetch

    const interval = setInterval(fetchMetrics, 5000); // Fetch every 5 seconds

    return () => clearInterval(interval);
  }, [galleryId]);

  if (loading && !metrics.crowd) { // Show loading only on initial load or if data is not yet available
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="text-center">
              <div className="text-sm text-muted-foreground dark:text-white/70">Loading...</div>
              <div className="text-lg font-semibold text-gray-800 dark:text-white/90">-</div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="col-span-2 md:col-span-4">
          <CardContent className="text-center">
            <div className="text-sm text-red-500">Error loading metrics: {error}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <Card>
        <CardContent className="text-center">
          <div className="text-sm text-muted-foreground dark:text-white/70">Oxygen</div>
          <div className="text-lg font-semibold text-gray-800 dark:text-white/90">{(metrics.oxygen || 0).toFixed(1)}%</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="text-center">
          <div className="text-sm text-muted-foreground dark:text-white/70">CO₂</div>
          <div className="text-lg font-semibold text-gray-800 dark:text-white/90">{(metrics.co2 || 0).toFixed(0)} ppm</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="text-center">
          <div className="text-sm text-muted-foreground dark:text-white/70">Other Gas</div>
          <div className="text-lg font-semibold text-gray-800 dark:text-white/90">{(metrics.otherGas || 0).toFixed(0)} ppm</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="text-center">
          <div className="text-sm text-muted-foreground dark:text-white/70">Crowd</div>
          <div className="text-lg font-semibold text-gray-800 dark:text-white/90">{metrics.crowd || 0} People</div>
        </CardContent>
      </Card>
    </div>
  );
}
