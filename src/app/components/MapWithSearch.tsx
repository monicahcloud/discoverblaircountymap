"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useRef, useState, useEffect, useMemo } from "react";
import MapGL, {
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
import { MapDetailsCard } from "./MapDetailsCard";
import MapMobileSheet from "./MapMobileSheet";
import WpImage from "@/components/WpImage";
import mapboxgl from "mapbox-gl";
// --- Icon sizing controls (tweak here later if you want) ---
const ICON_BASE_PX = 96; // was 64. Bigger source image = crisper & larger pin
// const ICON_SCALE_STOPS: any[] = [
//   "interpolate",
//   ["linear"],
//   ["zoom"],
//   10,
//   0.7, // was 0.45
//   14,
//   1.0, // was 0.70
//   17,
//   1.5, // was 1.10
// ];
// const CIRCLE_RADIUS_STOPS: any[] = [
//   "interpolate",
//   ["linear"],
//   ["zoom"],
//   10,
//   9, // was 6
//   14,
//   14, // was 10
//   17,
//   22, // was 16
// ];

// Convert "MapPin" or "HotelWifi" -> "map-pin", "hotel-wifi"
const toLucideName = (name: string) =>
  name
    ?.trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2") // camelCase/PascalCase -> kebab
    .replace(/[_\s]+/g, "-")
    .toLowerCase();

// Simple fallback pin svg (white pin) drawn over your colored circle
const DEFAULT_PIN_SVG = `
<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 22s8-4.5 8-10A8 8 0 1 0 4 12c0 5.5 8 10 8 10Z" />
  <circle cx="12" cy="12" r="3" fill="white"/>
</svg>`;

type Category = { name: string; icon: string; color: string };

const DEFAULT_COLOR = "#4b5563";

// turn “Beer/Wine/Spirits” → “beer-wine-spirits”, stable and safe for sprite IDs
const toSpriteId = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "mappin";

// draws an icon (svg/url) on a colored circle and returns an HTMLImageElement
const renderIconInCircle = async (
  iconUrlOrSvg: string,
  color: string
): Promise<HTMLImageElement> => {
  return new Promise(async (resolve) => {
    // const size = 64;
    const size = ICON_BASE_PX;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;

    // Background circle
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI);
    ctx.fillStyle = color || DEFAULT_COLOR;
    ctx.fill();

    const iconImg = new Image();
    if (iconUrlOrSvg.startsWith("<svg")) {
      const svgBlob = new Blob([iconUrlOrSvg], { type: "image/svg+xml" });
      iconImg.src = URL.createObjectURL(svgBlob);
    } else {
      iconImg.crossOrigin = "anonymous";
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
    iconImg.onerror = () => {
      // fallback to a plain dot if icon fetch fails
      const finalImg = new Image();
      finalImg.onload = () => resolve(finalImg);
      finalImg.src = canvas.toDataURL("image/png");
    };
  });
};

export default function MapWithSearch() {
  const mapRef = useRef<MapRef>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  // const [imagesReady, setImagesReady] = useState(false); // gate layer rendering

  const categoriesPerPage = 4;

  const searchParams = useSearchParams();

  useEffect(() => {
    const catFromURL = searchParams.get("category");
    if (catFromURL) setSelectedCategory(catFromURL);
  }, [searchParams]);

  // Load data + preload map sprites from categories
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

        // ensure locations are objects with lat/lng parsable
        setLocations(Array.isArray(locData) ? locData : []);

        const allCats: Category[] = [
          { name: "All", icon: "MapPin", color: DEFAULT_COLOR },
          ...(Array.isArray(catData) ? catData : []),
        ];
        setCategories(allCats);

        const map = mapRef.current?.getMap();
        if (!map) return;

        // add one sprite per category (skip "All" for data rendering; keep its sprite anyway for safety)
        await Promise.all(
          allCats.map(async (cat) => {
            const id = toSpriteId(cat.name);
            if (map.hasImage(id)) return;

            let iconSource = cat.icon;

            if (/^(https?:)?\/\//.test(cat.icon)) {
              // Hosted image URL
              iconSource = cat.icon;
            } else if (cat.icon.startsWith("<svg")) {
              // Raw SVG string
              iconSource = cat.icon;
            } else {
              // Treat as Lucide icon name
              const lucideName = toLucideName(cat.icon); // helper converts MapPin → map-pin
              try {
                const res = await fetch(
                  `https://api.iconify.design/lucide:${lucideName}.svg`
                );
                if (!res.ok) throw new Error("iconify fetch failed");
                const svg = await res.text();
                iconSource = svg?.trim().length ? svg : DEFAULT_PIN_SVG; // fallback if empty
              } catch {
                // graceful fallback to a local pin if network/iconify fails
                iconSource = DEFAULT_PIN_SVG;
              }
            }

            const finalImg = await renderIconInCircle(
              iconSource,
              cat.color || DEFAULT_COLOR
            );
            // Mapbox expects {width, height, data} or HTMLImageElement; GL JS 2 accepts HTMLImageElement
            map.addImage(id, finalImg, { pixelRatio: 2 });
          })
        );

        // setImagesReady(true);
      } catch (err) {
        console.error("❌ Failed to initialize map data:", err);
        // Allow map to render with fallback sprite names
        // setImagesReady(true);
      }
    })();
  }, []);
  // Auto-fit the map view to show all current filtered locations

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

  // category color lookup
  const categoryColor = useMemo(() => {
    const m = new globalThis.Map<string, string>(); // <-- not the React component
    categories.forEach((c) => m.set(c.name, c.color || DEFAULT_COLOR));
    return m;
  }, [categories]);

  const filteredLocations = useMemo(() => {
    const inCategory = (loc: any) =>
      selectedCategory === "All" || loc.category === selectedCategory;

    const base = searchQuery.trim()
      ? fuse.search(searchQuery.trim()).map((r) => r.item)
      : locations;

    // parse coords -> numbers; keep valid only
    return base
      .filter(inCategory)
      .map((loc: any) => {
        const lat = Number(loc.latitude);
        const lng = Number(loc.longitude);
        const valid = Number.isFinite(lat) && Number.isFinite(lng);
        return { ...loc, latitude: lat, longitude: lng, __valid: valid };
      })
      .filter((l: any) => l.__valid);
  }, [fuse, searchQuery, selectedCategory, locations]);

  // GeoJSON with safe icon id + resolved color by category
  const geoJson: FeatureCollection<Point, any> = useMemo(
    () => ({
      type: "FeatureCollection",
      features: filteredLocations.map((loc) => {
        const catName =
          typeof loc.category === "string" ? loc.category : "Other";
        const iconId = toSpriteId(catName); // must match addImage id
        const color = categoryColor.get(catName) || DEFAULT_COLOR;
        return {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [loc.longitude, loc.latitude], // lng, lat (numbers now)
          },
          properties: {
            ...loc,
            icon: iconId, // used by icon-image
            color,
          },
        };
      }),
    }),
    [filteredLocations, categoryColor]
  );
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || filteredLocations.length === 0) return;

    // Compute geographic bounds of all visible points
    const bounds = new mapboxgl.LngLatBounds();
    filteredLocations.forEach((loc) => {
      const lat = Number(loc.latitude);
      const lng = Number(loc.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        bounds.extend([lng, lat]);
      }
    });

    // Adjust zoom target depending on category
    const isMainMap = selectedCategory === "All";
    // const isWideOutdoor =
    // selectedCategory === "Great Outdoors" || selectedCategory === "Ski/Snow";

    map.fitBounds(bounds, { padding: 40, maxZoom: 14 });
    if (isMainMap) map.setZoom(11);
  }, [filteredLocations, selectedCategory]);
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
        map?.easeTo({ center: [lng, lat], zoom, duration: 600 });
      });
      return;
    }

    // unclustered point
    const [lng, lat] = (feature.geometry as Point).coordinates;
    const newSelected = {
      ...feature.properties,
      longitude: lng,
      latitude: lat,
    };
    setSelected(newSelected);

    fetch("/api/track-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "location",
        name: (newSelected as any).name,
      }),
    }).catch((err) => console.error("View tracking failed", err));

    if (window.innerWidth < 768) setIsSheetOpen(true);
  };

  const shareLocation = () => {
    if (!selected) return;
    const slug = String(selected.name || "").replace(/\s+/g, "-");
    navigator.clipboard.writeText(`${window.location.origin}/#${slug}`);
    alert("📍 Location link copied to clipboard!");
  };

  return (
    <div className="flex flex-col items-center w-full mt-10">
      <div className="w-full h-[600px] relative overflow-hidden shadow-lg rounded-none sm:rounded-xl max-w-screen-2xl mx-auto">
        {/* Mobile category pager */}
        <div className="sm:hidden flex flex-wrap justify-center gap-2 px-4 py-2 z-10 absolute top-2 left-0 right-0 rounded-md shadow-md">
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
                    onClick={() => {
                      setSelectedCategory(cat.name);
                      setSearchQuery("");
                      setSelected(null);
                      fetch("/api/track-view", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          type: "category",
                          name: cat.name,
                        }),
                      });
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

        {/* Search + category bar (desktop) */}
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
                      fetch("/api/track-view", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          type: "category",
                          name: cat.name,
                        }),
                      }).catch((err) =>
                        console.error("Category tracking failed", err)
                      );
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

        {/* Top controls (desktop) */}
        <div className="hidden sm:flex absolute top-4 left-0 right-0 z-10 px-4 flex-col gap-3 items-center sm:items-start pointer-events-none">
          <div className="flex gap-1 justify-end sm:justify-start">
            <div className="flex flex-row items-center md:absolute md:right-4 md:top-4 gap-2 bg-opacity-90 p-2 rounded-md shadow-md pointer-events-auto max-w-full overflow-x-auto">
              <button
                onClick={() => {
                  setSelectedCategory("All");
                  setSearchQuery("");
                  setSelected(null);
                  fetch("/api/track-view", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ type: "category", name: "All" }),
                  }).catch((err) =>
                    console.error("Category tracking failed", err)
                  );
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
                      setSearchQuery("");
                      setSelected(null);
                      fetch("/api/track-view", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          type: "category",
                          name: cat.name,
                        }),
                      }).catch((err) =>
                        console.error("Category tracking failed", err)
                      );
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

        <MapGL
          ref={mapRef}
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
          mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
          initialViewState={{
            latitude: 40.4531318,
            longitude: -78.3842227,
            zoom: 9,
          }}
          style={{ width: "100%", height: "100%" }}
          interactiveLayerIds={["clusters", "unclustered-point"]}
          onClick={handleMapClick}>
          <NavigationControl position="bottom-right" showCompass={false} />

          {/* Gate Source/Layers until sprites are registered, but still allow fallback rendering */}
          <Source
            id="locations"
            type="geojson"
            data={geoJson}
            cluster={true}
            clusterMaxZoom={14}
            clusterRadius={50}>
            {/* Cluster bubbles */}
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

            {/* Cluster counts */}
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

            {/* Colored dot behind icon to preserve a point even if icon couldn't load */}
            <Layer
              id="unclustered-color-circle"
              type="circle"
              filter={["!", ["has", "point_count"]]}
              paint={{
                "circle-color": ["coalesce", ["get", "color"], DEFAULT_COLOR],
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
                "circle-opacity": 1,
              }}
            />

            {/* The icon + optional label. Key bits:
                - coalesce(icon, 'marker-15') prevents blank icon when sprite isn't ready
                - icon-allow-overlap keeps icon visible when labels collide
                - text-optional keeps icon even if text is dropped
            */}
            <Layer
              id="unclustered-point"
              type="symbol"
              filter={["!", ["has", "point_count"]]}
              layout={{
                "icon-image": ["coalesce", ["get", "icon"], "marker-15"],
                "icon-size": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  10,
                  0.7,
                  14,
                  1.0,
                  17,
                  1.5,
                ],

                "icon-allow-overlap": true,
                "icon-anchor": "center",
                "text-field": ["step", ["zoom"], "", 15, ["get", "name"]],
                "text-offset": [0, 1.5],
                "text-size": 12,
                "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
                "text-optional": true,
              }}
              paint={{
                "icon-opacity": 1,
                "text-color": ["coalesce", ["get", "color"], DEFAULT_COLOR],
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
                <WpImage
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
        </MapGL>

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
