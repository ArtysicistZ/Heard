"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { getBackendBaseURL } from "@/core/config";
import { authClient } from "@/server/better-auth/client";

interface UserDistricts {
  council_district: string | null;
  state_house_dist: string | null;
  state_senate_dist: string | null;
  congressional_dist: string | null;
}

interface User {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  userType?: "constituent" | "candidate";
  city?: string | null;
  state?: string | null;
  districts?: UserDistricts;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = async () => {};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  signOut: noop,
  refresh: noop,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const session = await authClient.getSession();
      if (session.data?.user) {
        const u: User = {
          id: session.data.user.id,
          name: session.data.user.name,
          email: session.data.user.email,
          image: session.data.user.image,
        };

        // Fetch user profile to get userType + districts
        try {
          const profileResp = await fetch(
            `${getBackendBaseURL()}/api/civic/profile?user_id=${u.id}`,
          );
          if (profileResp.ok) {
            const profile = await profileResp.json();
            u.userType = profile.user_type;
            u.city = profile.city ?? null;
            u.state = profile.state ?? null;
            u.districts = {
              council_district: profile.council_district ?? null,
              state_house_dist: profile.state_house_dist ?? null,
              state_senate_dist: profile.state_senate_dist ?? null,
              congressional_dist: profile.congressional_dist ?? null,
            };
          }
        } catch {
          // Profile fetch failed — not critical
        }

        setUser(u);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    await authClient.signOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
