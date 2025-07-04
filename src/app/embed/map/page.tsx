// app/embed/map/page.tsx
"use client";

import MapWithSearch from "@/app/components/MapWithSearch";

export default function EmbedMapPage() {
  return (
    <main className="flex justify-center items-start min-h-screen bg-white p-0 m-0">
      <MapWithSearch />
    </main>
  );
}
