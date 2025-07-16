/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Phone, Globe, Navigation, Share2, MapPin } from "lucide-react";

export default function MapMobileSheet({
  open,
  onClose,
  location,
  shareLocation,
}: {
  open: boolean;
  onClose: () => void;
  location: any;
  shareLocation: () => void;
}) {
  if (!location) return null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent
        side="bottom"
        className="h-[80vh] overflow-y-auto overflow-x-hidden">
        <div className="px-4 pb-6">
          <SheetHeader>
            <div className="flex justify-between items-center">
              <SheetTitle>{location.name}</SheetTitle>
              <SheetClose asChild>
                {/* <Button size="icon" variant="ghost">
                <X className="w-5 h-5" />
              </Button> */}
              </SheetClose>
            </div>
          </SheetHeader>

          {/* Image */}
          {location.image && (
            <div className="w-full h-40 relative rounded-lg overflow-hidden my-4">
              <Image
                src={location.image}
                alt={location.name}
                fill
                className="object-cover"
              />
            </div>
          )}

          {/* Description */}
          <p className="text-sm text-gray-700 whitespace-pre-line mb-2">
            {location.description}
          </p>

          {/* Address */}
          <div className="flex items-start gap-2 text-gray-700 text-sm mb-4">
            <MapPin className="w-4 h-4 mt-[2px]" />
            <span>{location.address || "Blair County, PA"}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-around text-xs text-center">
            <div className="flex flex-col items-center gap-1">
              <Button variant="ghost" size="icon" asChild>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`}
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
                onClick={() => navigator.clipboard.writeText(location.phone)}>
                <Phone className="w-5 h-5" />
              </Button>
              <span>Call</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Button variant="ghost" size="icon" asChild>
                <a href={location.website} target="_blank">
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
        </div>
      </SheetContent>
    </Sheet>
  );
}
