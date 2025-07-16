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
import type { MapLayerMouseEvent } from "mapbox-gl";
import type { FeatureCollection, Point } from "geojson";
import "mapbox-gl/dist/mapbox-gl.css";
import Fuse from "fuse.js";
import { useSearchParams } from "next/navigation";
import NextImage from "next/image";
import { MapDetailsCard } from "./MapDetailsCard";
import MapMobileSheet from "./MapMobileSheet";

const renderIconInCircle = async (
  iconUrlOrSvg: string,
  color: string
): Promise<HTMLImageElement> => {
  return new Promise(async (resolve) => {
    const size = 64;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;

    // Draw colored circle background
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();

    const iconImg = new Image();
    if (iconUrlOrSvg.startsWith("<svg")) {
      const svgBlob = new Blob([iconUrlOrSvg], { type: "image/svg+xml" });
      iconImg.src = URL.createObjectURL(svgBlob);
    } else {
      iconImg.src = iconUrlOrSvg;
    }

    iconImg.onload = () => {
      const iconSize = size * 0.5;
      ctx.drawImage(
        iconImg,
        size / 2 - iconSize / 2,
        size / 2 - iconSize / 2,
        iconSize,
        iconSize
      );
      const finalImg = new Image();
      finalImg.onload = () => resolve(finalImg);
      finalImg.src = canvas.toDataURL("image/png");
    };
  });
};

export default function MapWithSearch() {
  const mapRef = useRef<MapRef>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [categories, setCategories] = useState<
    { name: string; icon: string; color: string }[]
  >([]);
  const [selected, setSelected] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const categoriesPerPage = 4;

  const searchParams = useSearchParams();

  useEffect(() => {
    const catFromURL = searchParams.get("category");
    if (catFromURL) setSelectedCategory(catFromURL);
  }, [searchParams]);

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
        const allCats = [
          { name: "All", icon: "MapPin", color: "#4b5563" },
          ...catData,
        ];
        setCategories(allCats);

        const map = mapRef.current?.getMap();
        if (!map) return;
        await Promise.all(
          allCats.map(async (cat) => {
            const id = cat.name.toLowerCase();
            if (map.hasImage(id)) return;

            let iconSource = cat.icon;
            if (/^(https?:)?\/\//.test(cat.icon)) {
              // Blob URL or hosted image
              iconSource = cat.icon;
            } else if (cat.icon.startsWith("<svg")) {
              iconSource = cat.icon;
            } else {
              // Assume Lucide
              const res = await fetch(
                `https://api.iconify.design/lucide:${cat.icon.toLowerCase()}.svg`
              );
              iconSource = await res.text();
            }

            const finalImg = await renderIconInCircle(iconSource, cat.color);
            map.addImage(id, finalImg);
          })
        );
      } catch (err) {
        console.error("❌ Failed to fetch data:", err);
      }
    })();
  }, []);

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

  const geoJson: FeatureCollection<Point, any> = useMemo(
    () => ({
      type: "FeatureCollection",
      features: filteredLocations.map((loc) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [loc.longitude, loc.latitude],
        },
        properties: {
          ...loc,
          // color: loc.color,
          // icon: loc.icon ? loc.icon.toLowerCase() : "mappin", // fallback
          icon: loc.category.toLowerCase() || "mappin", // fallback
          color: loc.color || "#4b5563", // fallback
        },
      })),
    }),
    [filteredLocations]
  );

  const handleMapClick = (e: MapLayerMouseEvent) => {
    const feature = e.features?.[0];
    if (!feature) return;

    const clusterId = feature.properties?.cluster_id;
    const map = mapRef.current?.getMap();
    const src = map?.getSource("locations") as any;
    if (!src) return;
    if (!clusterId) {
      const [lng, lat] = (feature.geometry as Point).coordinates;
      const newSelected = {
        ...feature.properties,
        longitude: lng,
        latitude: lat,
      };
      setSelected(newSelected);

      if (window.innerWidth < 768) {
        setIsSheetOpen(true);
      }
    }

    if (clusterId !== undefined) {
      src.getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
        if (err) return;
        const [lng, lat] = (feature.geometry as Point).coordinates;
        map?.easeTo({ center: [lng, lat], zoom, duration: 600 });
      });
    } else {
      const [lng, lat] = (feature.geometry as Point).coordinates;
      setSelected({ ...feature.properties, longitude: lng, latitude: lat });
    }
  };

  const shareLocation = () => {
    if (!selected) return;
    const slug = selected.name.replace(/\s+/g, "-");
    navigator.clipboard.writeText(`${window.location.origin}/#${slug}`);
    alert("📍 Location link copied to clipboard!");
  };

  return (
    <div className="flex flex-col items-center w-full mt-10">
      <div className="w-full max-w-6xl h-[600px] relative rounded-xl overflow-hidden shadow-lg">
        <div className="sm:hidden flex flex-wrap justify-center gap-2 px-4 py-2 z-10 absolute top-2 left-0 right-0 rounded-md shadow-md">
          <div className="flex gap-1 justify-end sm:justify-start">
            <div className="flex flex-row items-center md:absolute md:right-4 md:top-4 gap-2 bg-opacity-90 p-2 rounded-md shadow-md pointer-events-auto max-w-full overflow-x-auto">
              {/* <button
                onClick={() => {
                  setSelectedCategory("All");
                  setSearchQuery("");
                  setSelected(null);
                }}
                className={`px-3 py-1 text-sm whitespace-nowrap rounded-full border transition ${
                  selectedCategory === "All" && searchQuery === ""
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-800 border-gray-300 hover:bg-gray-100"
                }`}>
                Reset Filters
              </button> */}
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
                    onClick={() => {
                      setSelectedCategory(cat.name);
                      setSearchQuery(""); // Clear search when changing category
                      setSelected(null);
                    }}
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

        <div className="hidden sm:block">
          <MapDetailsCard
            selected={selected}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            shareLocation={shareLocation}
            clearSelection={() => setSelected(null)}
            mobileCategories={
              <div className="flex flex-wrap gap-2 justify-center">
                {paginatedCategories.map((cat) => (
                  <button
                    key={cat.name}
                    onClick={() => {
                      setSelectedCategory(cat.name);
                      setSearchQuery("");
                      setSelected(null);
                    }}
                    className={`px-3 py-1 text-sm whitespace-nowrap rounded-full border transition ${
                      selectedCategory === cat.name
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-800 border-gray-300 hover:bg-gray-100"
                    }`}>
                    {cat.name}
                  </button>
                ))}
              </div>
            }
          />
        </div>

        <div className="hidden sm:flex absolute top-4 left-0 right-0 z-10 px-4 flex-col gap-3 items-center sm:items-start pointer-events-none">
          {/* <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-2 bg-white border rounded-md text-sm pointer-events-auto"
          /> */}

          <div className="flex gap-1 justify-end sm:justify-start">
            <div className="flex flex-row items-center md:absolute md:right-4 md:top-4 gap-2 bg-opacity-90 p-2 rounded-md shadow-md pointer-events-auto max-w-full overflow-x-auto">
              <button
                onClick={() => {
                  setSelectedCategory("All");
                  setSearchQuery("");
                  setSelected(null);
                }}
                className={`px-3 py-1 text-sm whitespace-nowrap rounded-full border transition ${
                  selectedCategory === "All" && searchQuery === ""
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-800 border-gray-300 hover:bg-gray-100"
                }`}>
                Reset Filters
              </button>
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
                    onClick={() => {
                      setSelectedCategory(cat.name);
                      setSearchQuery(""); // Clear search when changing category
                      setSelected(null);
                    }}
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
            latitude: 40.4531318,
            longitude: -78.3842227,
            zoom: 10,
          }}
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
            <Layer
              id="clusters"
              type="circle"
              filter={["has", "point_count"]}
              paint={{
                "circle-color": "#2563eb",
                "circle-radius": [
                  "step",
                  ["get", "point_count"],
                  16,
                  10,
                  22,
                  25,
                  28,
                ],
                "circle-opacity": 0.85,
              }}
            />

            <Layer
              id="cluster-count"
              type="symbol"
              filter={["has", "point_count"]}
              layout={{
                "text-field": "{point_count_abbreviated}",
                "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
                "text-size": 14,
              }}
              paint={{ "text-color": "#fff" }}
            />
            <Layer
              id="unclustered-color-circle"
              type="circle"
              filter={["!", ["has", "point_count"]]}
              paint={{
                "circle-color": ["get", "color"],
                "circle-radius": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  10,
                  6,
                  14,
                  10,
                  17,
                  16,
                ],
                "circle-opacity": 0.7,
              }}
            />

            <Layer
              id="unclustered-point"
              type="symbol"
              filter={["!", ["has", "point_count"]]}
              layout={{
                "icon-image": ["get", "icon"],
                "icon-size": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  10,
                  0.4,
                  14,
                  0.6,
                  17,
                  1.1,
                ],
                "icon-allow-overlap": true,
                "icon-anchor": "center",
                "text-field": [
                  "step",
                  ["zoom"],
                  "", // No text at low zoom
                  15,
                  ["get", "name"],
                ],
                "text-offset": [0, 1.5],
                "text-size": 12,
                "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
              }}
              paint={{
                "icon-opacity": 1,
                "text-color": ["get", "color"],
                "text-halo-color": "#ffffff",
                "text-halo-width": 1.2,
              }}
            />
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
                <NextImage
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
        <MapMobileSheet
          open={isSheetOpen}
          onClose={() => {
            setIsSheetOpen(false);
            setSelected(null);
          }}
          location={selected}
          shareLocation={shareLocation}
        />
      </div>
    </div>
  );
}
