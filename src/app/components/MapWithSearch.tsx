"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useRef, useState, useEffect, useMemo } from "react";
import Map, {
  NavigationControl,
  Source,
  Layer,
  MapRef,
  Popup,
} from "react-map-gl/mapbox";

import type { MapLayerMouseEvent, CircleLayer, SymbolLayer } from "mapbox-gl";
import type { FeatureCollection, Point } from "geojson";

import "mapbox-gl/dist/mapbox-gl.css";
import Fuse from "fuse.js";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { MapDetailsCard } from "./MapDetailsCard";

/* ──────────────────────────── component ──────────────────────────── */
export default function MapWithSearch() {
  const mapRef = useRef<MapRef>(null);

  /* ──────────────────────────── state ──────────────────────────── */
  const [locations, setLocations] = useState<any[]>([]);
  const [categories, setCategories] = useState<
    { name: string; icon: string; color: string }[]
  >([]);
  const [selected, setSelected] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const categoriesPerPage = 4;

  const searchParams = useSearchParams();

  /* ─────────────────── sync category from URL ─────────────────── */
  useEffect(() => {
    const catFromURL = searchParams.get("category");
    if (catFromURL) setSelectedCategory(catFromURL);
  }, [searchParams]);

  /* ─────────────────────── fetch API data ─────────────────────── */
  useEffect(() => {
    (async () => {
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
    })();
  }, []);

  /* ────────────────── pagination for category pills ────────────── */
  const paginatedCategories = useMemo(
    () =>
      categories.slice(
        currentPage * categoriesPerPage,
        (currentPage + 1) * categoriesPerPage
      ),
    [categories, currentPage]
  );
  const hasNext = (currentPage + 1) * categoriesPerPage < categories.length;
  const hasPrev = currentPage > 0;

  /* ──────────────── fuzzy search & category filter ─────────────── */
  const fuse = useMemo(
    () =>
      new Fuse(locations, {
        keys: ["name", "description", "address", "category"],
        threshold: 0.3,
      }),
    [locations]
  );

  const filteredLocations = useMemo(() => {
    const inCategory = (loc: any) =>
      selectedCategory === "All" || loc.category === selectedCategory;

    if (!searchQuery.trim()) return locations.filter(inCategory);

    return fuse
      .search(searchQuery.trim())
      .map((r) => r.item)
      .filter(inCategory);
  }, [fuse, searchQuery, selectedCategory, locations]);

  /* ───────────────────────── geojson source ────────────────────── */
  const geoJson: FeatureCollection<Point, any> = useMemo(
    () => ({
      type: "FeatureCollection",
      features: filteredLocations.map((loc) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [loc.longitude, loc.latitude],
        },
        properties: { ...loc },
      })),
    }),
    [filteredLocations]
  );

  /* ─────────────────────── map click handler ───────────────────── */
  const handleMapClick = (e: MapLayerMouseEvent) => {
    const feature = e.features?.[0];
    if (!feature) return;

    const clusterId = feature.properties?.cluster_id;
    const map = mapRef.current?.getMap();
    const src = map?.getSource("locations") as any;
    if (!src) return;

    if (clusterId !== undefined) {
      src.getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
        if (err) return;
        const [lng, lat] = (feature.geometry as Point).coordinates;
        map?.easeTo({
          center: [lng, lat],
          zoom,
          duration: 600,
        });
      });
    } else {
      const [lng, lat] = (feature.geometry as Point).coordinates;
      setSelected({
        ...feature.properties,
        longitude: lng,
        latitude: lat,
      });
    }
  };

  /* ───────────────────── mapbox layer styles ───────────────────── */
  const clusterLayer: CircleLayer = {
    id: "clusters",
    type: "circle",
    source: "locations",
    filter: ["has", "point_count"],
    paint: {
      "circle-color": "#2563eb",
      "circle-radius": ["step", ["get", "point_count"], 16, 10, 22, 25, 28],
      "circle-opacity": 0.85,
    },
  };

  const clusterCountLayer: SymbolLayer = {
    id: "cluster-count",
    type: "symbol",
    source: "locations",
    filter: ["has", "point_count"],
    layout: {
      "text-field": "{point_count_abbreviated}",
      "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
      "text-size": 12,
    },
    paint: { "text-color": "#fff" },
  };

  const unclusteredPointLayer: CircleLayer = {
    id: "unclustered-point",
    type: "circle",
    source: "locations",
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-color": "#4b5563",
      "circle-radius": 6,
      "circle-stroke-width": 1,
      "circle-stroke-color": "#fff",
    },
  };

  /* ───────────────────────── share link ────────────────────────── */
  const shareLocation = () => {
    if (!selected) return;
    const slug = selected.name.replace(/\s+/g, "-");
    navigator.clipboard.writeText(`${window.location.origin}/#${slug}`);
    alert("📍 Location link copied to clipboard!");
  };

  /* ─────────────────────────── render ──────────────────────────── */
  return (
    <div className="flex flex-col items-center w-full mt-10">
      <div className="w-full max-w-6xl h-[600px] relative rounded-xl overflow-hidden shadow-lg">
        {/* side panel (desktop) */}
        <div className="hidden sm:block">
          <MapDetailsCard
            selected={selected}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            shareLocation={shareLocation}
            clearSelection={() => setSelected(null)}
          />
        </div>

        {/* search + category pills */}
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

        {/* map */}
        <Map
          ref={mapRef}
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
          mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
          initialViewState={{ latitude: 40.481, longitude: -78.3486, zoom: 10 }}
          style={{ width: "100%", height: "100%" }}
          interactiveLayerIds={["clusters", "unclustered-point"]}
          onClick={handleMapClick}>
          <NavigationControl position="bottom-right" showCompass={false} />

          <Source
            id="locations"
            type="geojson"
            data={geoJson}
            cluster={true}
            clusterMaxZoom={14}
            clusterRadius={50}>
            <Layer {...clusterLayer} />
            <Layer {...clusterCountLayer} />
            <Layer {...unclusteredPointLayer} />
          </Source>

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
