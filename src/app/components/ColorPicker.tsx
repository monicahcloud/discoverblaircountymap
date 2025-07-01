"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useState } from "react";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  name?: string;
}

const swatchColors = [
  "#6B7280", // slate-500
  "#4B5563", // gray-600
  "#7C3AED", // violet-600
  "#B45309", // amber-700
  "#15803D", // green-700
  "#065F46", // emerald-800
  "#1F2937", // gray-800
  "#1E40AF", // blue-800
  "#6D28D9", // purple-700
  "#9D174D", // rose-700
  "#166534", // green-800
  "#064E3B", // emerald-900
  "#7E22CE", // violet-800
  "#78350F", // amber-800
  "#4338CA", // indigo-700
];

export function ColorPicker({
  value,
  onChange,
  label = "Color",
  name = "color",
}: ColorPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-1">
      <Label htmlFor={name}>{label}</Label>
      <p className="text-xs text-muted-foreground mb-1">
        Click the circle below to choose a color
      </p>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            className="w-10 h-10 p-0 rounded-full border"
            style={{ backgroundColor: value }}
            aria-label="Pick color"
          />
        </PopoverTrigger>
        <PopoverContent className="w-fit p-3 space-y-3">
          {/* Swatches */}
          <div className="flex flex-wrap gap-2">
            {swatchColors.map((color) => (
              <button
                key={color}
                type="button"
                className="w-6 h-6 rounded-full border border-gray-300 hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
                onClick={() => {
                  onChange(color);
                  setOpen(false);
                }}
              />
            ))}
          </div>

          {/* Native picker */}
          <Input
            id={name}
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-10 w-24 border-none p-0 bg-transparent cursor-pointer"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
