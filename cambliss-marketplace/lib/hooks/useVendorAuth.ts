"use client";

import { useEffect, useState } from "react";
import { getVendorToken, vendorLogout, getVendorProfile } from "@/lib/api";

export function useVendorAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tok = getVendorToken();
    setToken(tok);

    if (tok) {
      getVendorProfile()
        .then((data) => setProfile(data))
        .catch(() => {
          vendorLogout();
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  return {
    token,
    profile,
    loading,
    isAuthenticated: !!token,
    logout: () => {
      vendorLogout();
      setToken(null);
      setProfile(null);
    },
  };
}
