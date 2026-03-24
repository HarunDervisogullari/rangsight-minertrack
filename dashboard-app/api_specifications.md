# API Specifications for Dashboard Data Integration

## Overview
These API specifications outline the required endpoints to replace simulated data with real data in the dashboard application. The existing APIs for galleries, persons, and devices remain unchanged and continue to provide base data for management operations.

## 1. Environmental Data API
**Replace simulated data in:** `EcommerceMetrics.tsx`

```
GET /api/environment/gallery/{galleryId}
```
**Request:** Gallery ID as path parameter

**Response:**
```typescript
{
  galleryId: string;
  timestamp: string;
  oxygen: number;       // percentage (currently simulated: Math.random() * 5 + 19)
  co2: number;          // ppm (currently simulated: Math.random() * 1000 + 400)
  otherGas: number;     // ppm (currently simulated: Math.random() * 100)
  crowd: number;        // people count (currently simulated: Math.floor(Math.random() * 50))
}
```

## 2. Gallery Occupancy API
**Replace simulated data in:** `MonthlyTarget.tsx`, `StatisticsChart.tsx`

```
GET /api/occupancy/galleries
```
**Request:** No parameters

**Response:**
```typescript
[
  {
    galleryId: number;
    name: string;
    capacity: number;     // from existing galleries API
    currentCrowd: number; // real count (currently simulated: Math.floor(Math.random() * 50))
    utilizationRate: number; // percentage
  }
]
```

## 3. Device Location and Status API
**Replace simulated data in:** `GalleryMonitorClient.tsx`

```
GET /api/devices/locations/gallery/{galleryId}
```
**Request:** Gallery ID as path parameter

**Response:**
```typescript
{
  hotspots: [
    {
      deviceId: number;
      name: string;
      position: {
        x: number;        // percentage within gallery (currently simulated: 35)
        y: number;        // percentage within gallery (currently simulated: 10)
      },
      signalStrength: number; // percentage (currently simulated: 85)
      connectedMiners: number; // count (currently simulated: 1)
    }
  ],
  miners: [
    {
      deviceId: number;    // helmet device ID
      personId: number;    // person wearing the helmet
      name: string;        // person name
      position: {
        x: number;         // percentage within gallery (currently simulated: 65)
        y: number;         // percentage within gallery (currently simulated: 90)
      },
      batteryLevel: number; // percentage (currently simulated: 76)
      connectedToHotspot: number; // hotspot ID
    }
  ]
}
```

## 4. Zone Density API
**Replace simulated data in:** `DemographicCard.tsx`

```
GET /api/zones/density
```
**Request:** No parameters

**Response:**
```typescript
[
  {
    zoneId: string;       // matches GALLERY_ZONES id
    galleryName: string;  // from galleries API or "Unknown"
    capacity: number;     // from galleries API or simulated fallback
    crowd: number;        // real count (currently simulated: Math.floor(Math.random() * 80))
    density: number;      // crowd / capacity
  }
]
```

## 5. Operations Data API
**Replace hardcoded data in:** `MonthlySalesChart.tsx`

```
GET /api/operations/monthly
```
**Request:** No parameters

**Response:**
```typescript
{
  months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  operations: [12, 5, 8, 6, 9, 16, 17, 4, 8, 5, 3, 13] // real monthly data
}
```

## Summary

These 5 new APIs will replace all the simulated data in your dashboard:

1. **Environmental API** - Real oxygen, CO₂, gas levels, and crowd count
2. **Occupancy API** - Real gallery utilization rates 
3. **Device Location API** - Real hotspot/miner positions, signal strength, battery levels
4. **Zone Density API** - Real density calculations for heat map
5. **Operations API** - Real monthly operations data

Your existing APIs (galleries, persons, devices) remain unchanged and continue to provide the base data for management operations. 