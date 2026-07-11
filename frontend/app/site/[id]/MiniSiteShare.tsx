"use client";

import { useState } from "react";

interface MiniSiteShareProps {
  title: string;
  url: string;
  className?: string;
}

export default function MiniSiteShare({
  title,
  url,
  className = "",
}: MiniSiteShareProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title, url, text: title });
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // user cancelled share — ignore
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleShare()}
      className={className}
    >
      {copied ? "Link kopyalandı" : "Paylaş"}
    </button>
  );
}
