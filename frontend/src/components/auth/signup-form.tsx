"use client";

import { Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { getBackendBaseURL } from "@/core/config";
import { authClient } from "@/server/better-auth/client";

import { useAuth } from "./auth-provider";
import { LocationPicker } from "./location-picker";

type UserType = "constituent" | "candidate";
type Step = "type" | "details" | "location" | "institution";

interface Institution {
  id: string;
  name: string;
  category: string;
  officeholder: string | null;
  district: string | null;
}

interface LocationData {
  lat: number;
  lng: number;
  districts: {
    council_district: string | null;
    state_house_dist: string | null;
    state_senate_dist: string | null;
    congressional_dist: string | null;
    state: string | null;
    city: string | null;
    county: string | null;
  };
}

export function SignupForm() {
  const [step, setStep] = useState<Step>("type");
  const [userType, setUserType] = useState<UserType>("constituent");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  // Candidate fields
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState("");
  const [institutionsLoading, setInstitutionsLoading] = useState(false);
  const router = useRouter();
  const _auth = useAuth();

  // Load institutions for candidate signup
  useEffect(() => {
    if (step === "institution") {
      setInstitutionsLoading(true);
      fetch(`${getBackendBaseURL()}/api/civic/institutions`)
        .then((r) => r.json())
        .then((data) => {
          setInstitutions(data.institutions ?? []);
        })
        .catch(() => {
          setError("Failed to load institutions");
        })
        .finally(() => {
          setInstitutionsLoading(false);
        });
    }
  }, [step]);

  const handleDetailsSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (userType === "constituent") {
      setStep("location");
    } else {
      setStep("institution");
    }
  };

  const handleFinalSubmit = useCallback(
    async (overrideLocation?: LocationData) => {
      setError(null);
      setLoading(true);
      try {
        const result = await authClient.signUp.email({
          name,
          email,
          password,
        });
        if (result.error) {
          setError(result.error.message ?? "Sign up failed");
          setLoading(false);
          return;
        }

        const userId = result.data?.user?.id;

        // Build profile payload
        const profilePayload: Record<string, unknown> = {
          user_id: userId,
          user_type: userType,
        };

        const loc = overrideLocation ?? locationData;
        if (userType === "constituent" && loc) {
          Object.assign(profilePayload, {
            latitude: loc.lat,
            longitude: loc.lng,
            ...loc.districts,
          });
        } else if (userType === "candidate" && selectedInstitutionId) {
          profilePayload.institution_id = selectedInstitutionId;
        }

        const profileRes = await fetch(`${getBackendBaseURL()}/api/civic/profile`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(profilePayload),
        });

        if (!profileRes.ok) {
          console.warn(
            "Failed to create user profile:",
            await profileRes.text(),
          );
        }

        router.push("/auth/login");
      } catch {
        setError("An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    },
    [
      name,
      email,
      password,
      userType,
      locationData,
      selectedInstitutionId,
      router,
    ],
  );

  // Step 1: Choose user type
  if (step === "type") {
    return (
      <div className="flex w-full max-w-sm flex-col gap-6">
        <p className="text-muted-foreground text-center text-sm">
          How will you use Heard?
        </p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => {
              setUserType("constituent");
              setStep("details");
            }}
            className="border-border hover:border-blue-500 hover:bg-blue-500/5 rounded-lg border p-4 text-left transition-colors"
          >
            <div className="text-base font-semibold">
              I&apos;m a Constituent
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              Submit grievances, contact your officials, and follow issues in
              your community.
            </p>
          </button>
          <button
            type="button"
            onClick={() => {
              setUserType("candidate");
              setStep("details");
            }}
            className="border-border hover:border-blue-500 hover:bg-blue-500/5 rounded-lg border p-4 text-left transition-colors"
          >
            <div className="text-base font-semibold">
              I&apos;m an Elected Official
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              See what your constituents care about and respond to their
              concerns.
            </p>
          </button>
        </div>
        <p className="text-muted-foreground text-center text-sm">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-blue-500 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    );
  }

  // Step 2: Account details
  if (step === "details") {
    return (
      <form
        onSubmit={handleDetailsSubmit}
        className="flex w-full max-w-sm flex-col gap-4"
      >
        <button
          type="button"
          onClick={() => setStep("type")}
          className="text-muted-foreground self-start text-sm hover:underline"
        >
          &larr; Back
        </button>
        <p className="text-muted-foreground text-sm">
          Signing up as{" "}
          <span className="text-foreground font-medium">
            {userType === "constituent"
              ? "a Constituent"
              : "an Elected Official"}
          </span>
        </p>
        <div className="flex flex-col gap-2">
          <label htmlFor="name" className="text-sm font-medium">
            Full Name
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border-border bg-background rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Jane Doe"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="signup-email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="signup-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border-border bg-background rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="you@example.com"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="signup-password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="signup-password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border-border bg-background rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="At least 8 characters"
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button type="submit" className="w-full">
          Continue
        </Button>
        <p className="text-muted-foreground text-center text-sm">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-blue-500 hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    );
  }

  // Step 3a: Location picker (constituent)
  if (step === "location") {
    return (
      <div className="flex w-full max-w-2xl flex-col gap-4">
        <button
          type="button"
          onClick={() => setStep("details")}
          className="text-muted-foreground self-start text-sm hover:underline"
        >
          &larr; Back
        </button>
        <div>
          <div className="text-base font-semibold">Find Your Districts</div>
          <p className="text-muted-foreground mt-1 text-sm">
            Share your location so we can match you to your elected officials.
          </p>
        </div>
        <LocationPicker
          onConfirm={(result) => {
            const loc = {
              lat: result.lat,
              lng: result.lng,
              districts: result.districts,
            };
            setLocationData(loc);
            void handleFinalSubmit(loc);
          }}
        />
        {loading && (
          <div className="flex items-center justify-center gap-2 text-sm">
            <Loader2Icon className="size-4 animate-spin" />
            Creating your account...
          </div>
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    );
  }

  // Step 3b: Institution picker (candidate)
  if (step === "institution") {
    return (
      <div className="flex w-full max-w-sm flex-col gap-4">
        <button
          type="button"
          onClick={() => setStep("details")}
          className="text-muted-foreground self-start text-sm hover:underline"
        >
          &larr; Back
        </button>
        <div>
          <div className="text-base font-semibold">Select Your Office</div>
          <p className="text-muted-foreground mt-1 text-sm">
            Choose the institution you represent. We&apos;ll verify your
            identity.
          </p>
        </div>
        {institutionsLoading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm">
            <Loader2Icon className="size-4 animate-spin" />
            Loading institutions...
          </div>
        ) : (
          <select
            value={selectedInstitutionId}
            onChange={(e) => setSelectedInstitutionId(e.target.value)}
            className="border-border bg-background rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select an institution...</option>
            {institutions.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.name}
                {inst.district ? ` (District ${inst.district})` : ""}
              </option>
            ))}
          </select>
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button
          onClick={() => void handleFinalSubmit()}
          disabled={!selectedInstitutionId || loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2Icon className="mr-2 size-4 animate-spin" />
              Creating account...
            </>
          ) : (
            "Create Account"
          )}
        </Button>
      </div>
    );
  }

  return null;
}
