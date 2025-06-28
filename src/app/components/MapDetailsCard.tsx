/* eslint-disable @typescript-eslint/no-explicit-any */
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, Globe, Navigation, Share2, MapPin, X } from "lucide-react";
import Image from "next/image";
import logo from "../assets/logo.png";

export function MapDetailsCard({
  selected,
  searchQuery,
  setSearchQuery,
  shareLocation,
  clearSelection,
}: {
  selected: any;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  shareLocation: () => void;
  clearSelection: () => void;
}) {
  return (
    <Card className="absolute top-4 left-4 z-10 w-[360px] max-h-[500px] flex flex-col rounded-xl shadow-xl bg-white">
      {/* 🔝 Top Bar */}
      <div className="flex justify-between items-center px-4 py-2 border-b">
        <Image src={logo} alt="Logo" width={100} height={32} />
        <Button variant="ghost" size="icon" onClick={clearSelection}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* 🔍 Search Input */}
      <div className="px-4 pt-2">
        <Input
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* 📜 Scrollable Content */}
      <div className="flex-1 overflow-y-auto max-h-[calc(500px-96px)]">
        {/* 📸 Location Image */}
        {selected && (
          <div className="w-full h-32 relative">
            <Image
              src={selected.image}
              alt={selected.name}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* 🎯 Action Buttons */}
        {selected && (
          <div className="flex justify-around py-3 border-b px-2 text-xs text-center">
            <div className="flex flex-col items-center gap-1">
              <Button variant="ghost" size="icon" asChild title="Directions">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${selected.latitude},${selected.longitude}`}
                  target="_blank">
                  <Navigation className="w-5 h-5" />
                </a>
              </Button>
              <span>Directions</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigator.clipboard.writeText(selected.phone)}>
                <Phone className="w-5 h-5" />
              </Button>
              <span>Call</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <Button variant="ghost" size="icon" asChild>
                <a href={selected.website} target="_blank">
                  <Globe className="w-5 h-5" />
                </a>
              </Button>
              <span>Website</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <Button variant="ghost" size="icon" onClick={shareLocation}>
                <Share2 className="w-5 h-5" />
              </Button>
              <span>Share</span>
            </div>
          </div>
        )}

        {/* 📝 Description + Address */}
        <CardContent className="px-4 py-3 text-sm space-y-3">
          {selected ? (
            <>
              <div className="text-gray-700 whitespace-pre-line">
                {selected.description}
              </div>
              <div className="flex items-start gap-2 text-gray-700 text-sm">
                <MapPin className="w-4 h-4 mt-[2px]" />
                <hr />
                <span className="font-semibold text-md">
                  {selected.address || "Blair County, PA"}
                </span>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">Search or select a location</p>
          )}
        </CardContent>
      </div>
    </Card>
  );
}
