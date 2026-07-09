"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { captureReferralFromSearch } from "@/lib/referral-storage";

export default function ReferralCapture() {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (!ref) return;
    captureReferralFromSearch(`?ref=${encodeURIComponent(ref)}`);
  }, [searchParams, pathname]);

  return null;
}