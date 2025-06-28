// app/page.tsx
"use client";

import MapWithSearch from "./components/MapWithSearch";

export default function Home() {
  return (
    <main className="flex justify-center items-start min-h-screen bg-gray-100 p-4">
      <MapWithSearch />
    </main>
  );
}
