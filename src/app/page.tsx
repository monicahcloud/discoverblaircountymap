import { Suspense } from "react";
import MapWithSearch from "./components/MapWithSearch";

// Required to disable static rendering (for useSearchParams)
export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="w-full min-h-screen bg-gray-100 px-5">
      <Suspense
        fallback={<div className="text-center p-4">Loading map...</div>}>
        <MapWithSearch />
      </Suspense>
    </main>
  );
}
