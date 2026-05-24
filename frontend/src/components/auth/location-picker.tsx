"use client";

import {
  CheckCircleIcon,
  Loader2Icon,
  MapPinIcon,
  XCircleIcon,
} from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { getBackendBaseURL } from "@/core/config";

import {
  type OfficialInfo,
  RepresentativesHierarchy,
} from "./representatives-hierarchy";

interface DistrictInfo {
  council_district: string | null;
  state_house_dist: string | null;
  state_senate_dist: string | null;
  congressional_dist: string | null;
  state: string | null;
  city: string | null;
  county: string | null;
}

interface LocationResult {
  lat: number;
  lng: number;
  districts: DistrictInfo;
  officials: OfficialInfo[];
}

interface LocationPickerProps {
  onConfirm: (result: LocationResult) => void;
}

export function LocationPicker({ onConfirm }: LocationPickerProps) {
  const [status, setStatus] = useState<
    "idle" | "locating" | "looking_up" | "done" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LocationResult | null>(null);

  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setStatus("error");
      return;
    }

    setStatus("locating");
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        setStatus("looking_up");

        void (async () => {
          try {
            const resp = await fetch(`${getBackendBaseURL()}/api/civic/locate`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ lat, lng }),
            });

            if (!resp.ok) {
              const text = await resp.text();
              throw new Error(text || `HTTP ${resp.status}`);
            }

            const data = await resp.json();
            const locationResult: LocationResult = {
              lat,
              lng,
              districts: data.districts,
              officials: data.officials,
            };
            setResult(locationResult);
            setStatus("done");
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Failed to look up districts",
            );
            setStatus("error");
          }
        })();
      },
      (err) => {
        const messages: Record<number, string> = {
          1: "Location permission denied. Please allow location access and try again.",
          2: "Location unavailable. Please try again.",
          3: "Location request timed out. Please try again.",
        };
        setError(messages[err.code] ?? "Failed to get location");
        setStatus("error");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  if (status === "done" && result) {
    const d = result.districts;
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-emerald-500">
          <CheckCircleIcon className="size-5" />
          <span className="text-sm font-medium">Location confirmed</span>
        </div>

        <div className="border-border rounded-lg border p-3">
          <div className="text-sm font-medium">Your Districts</div>
          <div className="mt-2 grid grid-cols-1 gap-1.5 text-sm">
            {d.city && (
              <div className="text-muted-foreground">
                <span className="text-foreground font-medium">City:</span>{" "}
                {d.city}
              </div>
            )}
            {d.state && (
              <div className="text-muted-foreground">
                <span className="text-foreground font-medium">State:</span>{" "}
                {d.state}
              </div>
            )}
            {d.council_district && (
              <div className="text-muted-foreground">
                <span className="text-foreground font-medium">
                  City Council:
                </span>{" "}
                District {d.council_district}
              </div>
            )}
            {d.state_house_dist && (
              <div className="text-muted-foreground">
                <span className="text-foreground font-medium">
                  State House:
                </span>{" "}
                District {d.state_house_dist}
              </div>
            )}
            {d.state_senate_dist && (
              <div className="text-muted-foreground">
                <span className="text-foreground font-medium">
                  State Senate:
                </span>{" "}
                District {d.state_senate_dist}
              </div>
            )}
            {d.congressional_dist && (
              <div className="text-muted-foreground">
                <span className="text-foreground font-medium">US House:</span>{" "}
                {d.state}-{d.congressional_dist}
              </div>
            )}
          </div>
        </div>

        <RepresentativesHierarchy
          officials={result.officials}
          cityName={d.city}
        />

        <Button onClick={() => onConfirm(result)} className="w-full">
          Confirm &amp; Continue
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div className="flex items-start gap-2 text-sm text-red-500">
          <XCircleIcon className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={handleLocate}
        disabled={status === "locating" || status === "looking_up"}
        className="w-full"
      >
        {status === "locating" ? (
          <>
            <Loader2Icon className="mr-2 size-4 animate-spin" />
            Getting your location...
          </>
        ) : status === "looking_up" ? (
          <>
            <Loader2Icon className="mr-2 size-4 animate-spin" />
            Looking up your districts...
          </>
        ) : (
          <>
            <MapPinIcon className="mr-2 size-4" />
            Share My Location
          </>
        )}
      </Button>

      <p className="text-muted-foreground text-center text-xs">
        We use your location to find your political districts and elected
        officials. Your exact location is never shared publicly.
      </p>
    </div>
  );
}