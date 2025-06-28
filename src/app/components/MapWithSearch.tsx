/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import Map, { Marker, Popup, NavigationControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { MapDetailsCard } from "./MapDetailsCard";
import Image from "next/image";
import Fuse from "fuse.js";

export default function MapWithSearch() {
  const mapRef = useRef<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>(["All"]);
  const [selected, setSelected] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const categoriesPerPage = 4;

  // 🎨 Generate soft pastel color from string
  const pastelColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 85%)`;
  };

  // 📡 Fetch locations + categories from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [locRes, catRes] = await Promise.all([
          fetch("/api/locations"),
          fetch("/api/categories"),
        ]);
        const [locData, catData] = await Promise.all([
          locRes.json(),
          catRes.json(),
        ]);
        setLocations(locData);
        setCategories(["All", ...catData]);
      } catch (err) {
        console.error("❌ Failed to fetch data:", err);
      }
    };
    fetchData();
  }, []);

  const paginatedCategories = useMemo(() => {
    return categories.slice(
      currentPage * categoriesPerPage,
      (currentPage + 1) * categoriesPerPage
    );
  }, [categories, currentPage]);

  const hasNext = (currentPage + 1) * categoriesPerPage < categories.length;
  const hasPrev = currentPage > 0;

  // 🔍 Fuzzy search instance
  const fuse = useMemo(() => {
    return new Fuse(locations, {
      keys: ["name", "description", "address", "category"],
      threshold: 0.3,
    });
  }, [locations]);

  // 🔍 Filter locations by search + category
  const filteredLocations = useMemo(() => {
    const matchesCategory = (loc: any) =>
      selectedCategory === "All" || loc.category === selectedCategory;

    if (searchQuery.trim() === "") {
      return locations.filter(matchesCategory);
    }

    const fuzzyResults = fuse.search(searchQuery.trim());
    const matchedItems = fuzzyResults.map((result) => result.item);
    return matchedItems.filter(matchesCategory);
  }, [fuse, searchQuery, selectedCategory, locations]);

  const shareLocation = () => {
    if (selected) {
      const slug = selected.name.replace(/\s+/g, "-");
      navigator.clipboard.writeText(`${window.location.origin}/#${slug}`);
      alert("📍 Location link copied to clipboard!");
    }
  };

  return (
    <div className="flex flex-col items-center w-full">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">
        Explore Blair County
      </h1>

      <div className="w-full max-w-6xl h-[600px] relative rounded-xl overflow-hidden shadow-lg">
        {/* 🔍 Search & Details */}
        <MapDetailsCard
          selected={selected}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          shareLocation={shareLocation}
          clearSelection={() => setSelected(null)}
        />

        {/* 🎯 Category Filter */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2 p-2 rounded-md shadow-md bg-white bg-opacity-90">
          <div className="flex gap-2">
            {paginatedCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 text-sm rounded-full border transition ${
                  selectedCategory === cat
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-800 border-gray-300 hover:bg-gray-100"
                }`}>
                {cat}
              </button>
            ))}
          </div>
          <button
            onClick={() => setCurrentPage((p) => p - 1)}
            disabled={!hasPrev}
            className="px-2 py-1 text-sm rounded-md border bg-white border-gray-300 disabled:opacity-30">
            ◀
          </button>
          <button
            onClick={() => setCurrentPage((p) => p + 1)}
            disabled={!hasNext}
            className="px-2 py-1 text-sm rounded-md border bg-white border-gray-300 disabled:opacity-30">
            ▶
          </button>
        </div>

        {/* 🗺 Map */}
        <Map
          ref={mapRef}
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
          mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
          initialViewState={{
            latitude: 40.481,
            longitude: -78.3486,
            zoom: 10,
          }}
          style={{ width: "100%", height: "100%" }}>
          {/* 🧭 Zoom Control */}
          <NavigationControl position="bottom-right" showCompass={false} />

          {/* 📍 Markers */}
          {filteredLocations.map((loc) => (
            <Marker
              key={loc.id}
              latitude={loc.latitude}
              longitude={loc.longitude}
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setSelected(loc);
              }}>
              <div
                className="w-12 h-[60px] relative transform hover:scale-110 transition-transform cursor-pointer border border-white rounded-full overflow-hidden"
                style={{
                  backgroundColor: pastelColor(loc.category),
                  clipPath:
                    "path('M24 0C10.745 0 0 10.745 0 24C0 37.255 24 60 24 60C24 60 48 37.255 48 24C48 10.745 37.255 0 24 0Z')",
                  WebkitClipPath:
                    "path('M24 0C10.745 0 0 10.745 0 24C0 37.255 24 60 24 60C24 60 48 37.255 48 24C48 10.745 37.255 0 24 0Z')",
                }}>
                <Image
                  src={loc.image}
                  alt={loc.name}
                  fill
                  className="object-cover"
                />
              </div>
            </Marker>
          ))}

          {/* 🧾 Popup */}
          {selected && (
            <Popup
              longitude={selected.longitude}
              latitude={selected.latitude}
              anchor="top"
              onClose={() => setSelected(null)}
              closeOnClick={false}>
              <div className="text-sm max-w-xs space-y-1">
                <h3 className="font-bold text-base">{selected.name}</h3>
              </div>
            </Popup>
          )}
        </Map>
      </div>
    </div>
  );
}
