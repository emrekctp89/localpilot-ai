"use client";

import { useState } from "react";
import type { SectorDemo } from "@/lib/marketing-site";

interface SectorDemoShowcaseProps {
  demos: SectorDemo[];
}

export default function SectorDemoShowcase({ demos }: SectorDemoShowcaseProps) {
  const [activeId, setActiveId] = useState(demos[0]?.id ?? "");

  const activeDemo = demos.find((demo) => demo.id === activeId) ?? demos[0];
  if (!activeDemo) return null;

  return (
    <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
      <div className="flex flex-wrap gap-2 lg:flex-col">
        {demos.map((demo) => {
          const isActive = demo.id === activeDemo.id;
          return (
            <button
              key={demo.id}
              type="button"
              onClick={() => setActiveId(demo.id)}
              className={`rounded-2xl border px-4 py-3 text-left transition ${
                isActive
                  ? "border-indigo-200 bg-indigo-50 shadow-sm"
                  : "border-gray-200 bg-white hover:border-indigo-100 hover:bg-indigo-50/40"
              }`}
            >
              <p className="font-bold text-gray-900">{demo.name}</p>
              <p className="mt-1 text-xs text-gray-500">{demo.tagline}</p>
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xl">
        <div className={`${activeDemo.accentLight} px-6 py-5`}>
          <p className={`text-xs font-black uppercase tracking-widest ${activeDemo.accentText}`}>
            Sektör önizlemesi
          </p>
          <h3 className="mt-1 text-2xl font-black text-gray-900">
            {activeDemo.name}
          </h3>
          <p className="mt-1 text-sm text-gray-600">{activeDemo.tagline}</p>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-gray-100 bg-[#fafafa] p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-bold text-gray-500">Panel görünümü</p>
              <span
                className={`rounded-full px-3 py-1 text-xs font-black text-white ${activeDemo.accent}`}
              >
                Canlı demo
              </span>
            </div>

            <h4 className="text-xl font-black text-gray-900">
              {activeDemo.preview.headline}
            </h4>

            <div className="mt-4 grid grid-cols-3 gap-3">
              {[activeDemo.preview.metricA, activeDemo.preview.metricB, activeDemo.preview.metricC].map(
                (metric) => (
                  <div
                    key={metric.label}
                    className="rounded-xl border border-white bg-white p-3 shadow-sm"
                  >
                    <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                      {metric.label}
                    </p>
                    <p className="mt-1 text-lg font-black text-gray-900">
                      {metric.value}
                    </p>
                  </div>
                ),
              )}
            </div>

            <button
              type="button"
              className={`mt-4 w-full rounded-xl px-4 py-3 text-sm font-bold text-white ${activeDemo.accent}`}
            >
              {activeDemo.preview.actionLabel}
            </button>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-4">
              <p className="text-xs font-black uppercase tracking-widest text-gray-400">
                {activeDemo.preview.listTitle}
              </p>
              <ul className="mt-3 space-y-2">
                {activeDemo.preview.listItems.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-sm text-gray-700"
                  >
                    <span className="text-indigo-500" aria-hidden="true">
                      ✦
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <ul className="space-y-2">
              {activeDemo.highlights.map((highlight) => (
                <li
                  key={highlight}
                  className="rounded-xl bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700"
                >
                  {highlight}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}