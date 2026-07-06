"use client";

import type { Business } from "@/lib/domain-types";

interface BusinessSwitcherProps {
  businesses: Business[];
  activeBusinessId?: string;
  onSwitch: (businessId: string) => void;
  label?: string;
}

export default function BusinessSwitcher({
  businesses,
  activeBusinessId,
  onSwitch,
  label = "İşletme seç",
}: BusinessSwitcherProps) {
  if (businesses.length <= 1) return null;

  return (
    <label className="flex items-center gap-2 rounded-full border border-gray-200 bg-white/80 px-3 py-2 text-sm">
      <span className="font-bold text-gray-500">{label}</span>
      <select
        value={activeBusinessId || businesses[0]?.id || ""}
        onChange={(event) => onSwitch(event.target.value)}
        className="bg-transparent font-bold text-gray-900 outline-none"
      >
        {businesses.map((business) => (
          <option key={business.id} value={business.id}>
            {business.name || "İşletme"}
          </option>
        ))}
      </select>
    </label>
  );
}