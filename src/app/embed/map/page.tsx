"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

// Dynamically import MapWithSearch with no SSR
const MapWithSearch = dynamic(() => import("@/app/components/MapWithSearch"), {
  ssr: false,
});

export default function MapWithSearchWrapper() {
  return (
    <Suspense fallback={<div className="text-center p-4">Loading map...</div>}>
      <MapWithSearch />
    </Suspense>
  );
}
