// app/page.tsx or app/embed/map/page.tsx
"use client";
import dynamic from "next/dynamic";
import { Suspense } from "react";

// Dynamically import to force CSR (optional but can help avoid hydration mismatches)
const MapWithSearch = dynamic(() => import("@/app/components/MapWithSearch"), {
  ssr: false,
});

export default function Home() {
  return (
    <main className="flex justify-center items-start min-h-screen bg-gray-100 p-4">
      <Suspense
        fallback={<div className="text-center p-4">Loading map...</div>}>
        <MapWithSearch />
      </Suspense>
    </main>
  );
}
