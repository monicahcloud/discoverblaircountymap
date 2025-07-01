/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useRef, useState, useEffect, useMemo, JSX } from "react";
import Map, { Marker, Popup, NavigationControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { MapDetailsCard } from "./MapDetailsCard";
import Image from "next/image";
import Fuse from "fuse.js";
import * as LucideIcons from "lucide-react";

export default function MapWithSearch() {
  const mapRef = useRef<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [categories, setCategories] = useState<
    { name: string; icon: string; color: string }[]
  >([]);

  const [selected, setSelected] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const categoriesPerPage = 4;

  const getCategoryColor = (categoryName: string): string => {
    return (
      categories.find((cat) => cat.name === categoryName)?.color || "#4B5563"
    ); // Fallback to gray if no color found
  };

  const getLucideIcon = (iconName: string): JSX.Element => {
    const Icon = (LucideIcons as any)[iconName] || LucideIcons.MapPin;
    return <Icon className="w-6 h-6 text-white" />;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [locRes, catRes] = await Promise.all([
          fetch("/api/locations"),
          fetch("/api/admin/categories"),
        ]);
        const [locData, catData] = await Promise.all([
          locRes.json(),
          catRes.json(),
        ]);
        setLocations(locData);
        setCategories([{ name: "All", icon: "MapPin" }, ...catData]);
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

  const fuse = useMemo(() => {
    return new Fuse(locations, {
      keys: ["name", "description", "address", "category"],
      threshold: 0.3,
    });
  }, [locations]);

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
        <div className="hidden sm:block">
          <MapDetailsCard
            selected={selected}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            shareLocation={shareLocation}
            clearSelection={() => setSelected(null)}
          />
        </div>

        <div className="absolute top-4 z-10 w-full px-4 flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-start pointer-events-none">
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="sm:hidden px-3 py-2 bg-white border rounded-md text-sm pointer-events-auto"
          />

          <div className="flex gap-1 justify-end sm:justify-start">
            <div className="flex flex-row items-center md:absolute md:right-4 md:top-4 gap-2 bg-opacity-90 p-2 rounded-md shadow-md pointer-events-auto max-w-full overflow-x-auto">
              <button
                onClick={() => setCurrentPage((p) => p - 1)}
                disabled={!hasPrev}
                className="md:px-2 md:py-1 text-sm rounded-md border bg-white border-gray-300 disabled:opacity-30">
                ◀
              </button>
              <div className="flex flex-wrap gap-2">
                {paginatedCategories.map((cat) => (
                  <button
                    key={cat.name}
                    onClick={() => setSelectedCategory(cat.name)}
                    className={`px-3 py-1 text-sm whitespace-nowrap rounded-full border transition ${
                      selectedCategory === cat.name
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-800 border-gray-300 hover:bg-gray-100"
                    }`}>
                    {cat.name}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={!hasNext}
                className="md:px-2 md:py-1 text-sm rounded-md border bg-white border-gray-300 disabled:opacity-30">
                ▶
              </button>
            </div>
          </div>
        </div>

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
          <NavigationControl position="bottom-right" showCompass={false} />

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
                className="w-12 h-[60px] flex items-center justify-center transform hover:scale-110 transition-transform cursor-pointer border border-white rounded-full"
                style={{
                  backgroundColor: getCategoryColor(loc.category),

                  clipPath:
                    "path('M24 0C10.745 0 0 10.745 0 24C0 37.255 24 60 24 60C24 60 48 37.255 48 24C48 10.745 37.255 0 24 0Z')",
                  WebkitClipPath:
                    "path('M24 0C10.745 0 0 10.745 0 24C0 37.255 24 60 24 60C24 60 48 37.255 48 24C48 10.745 37.255 0 24 0Z')",
                }}>
                {getLucideIcon(
                  categories.find((c) => c.name === loc.category)?.icon ||
                    "MapPin"
                )}
              </div>
            </Marker>
          ))}

          {selected && (
            <Popup
              longitude={selected.longitude}
              latitude={selected.latitude}
              anchor="top"
              onClose={() => setSelected(null)}
              closeOnClick={false}>
              <div className="text-sm max-w-xs space-y-1">
                <h3 className="font-bold text-base">{selected.name}</h3>
                <Image
                  src={selected.image}
                  alt={selected.name}
                  width={200}
                  height={120}
                  className="rounded-md object-cover"
                />
                <p className="md:hidden">{selected.description}</p>
              </div>
            </Popup>
          )}
        </Map>
      </div>
    </div>
  );
}
