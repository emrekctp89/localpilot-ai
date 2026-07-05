"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  Appointment,
  Business,
  MiniSiteData,
  Order,
  StaffTask,
} from "@/lib/domain-types";
import { loadOperationalSnapshot } from "@/lib/repositories";

interface OperasyonOzetiProps {
  business: Business;
  setActiveTab: (tab: string) => void;
}

const EMPTY_DATA: MiniSiteData = {
  appointments: [],
  orders: [],
  tasks: [],
};

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
    <path
      d="M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    />
  </svg>
);

const OrderIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
    <path
      d="M4 7h16l-1 13H5L4 7Zm3 0a5 5 0 0 1 10 0"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    />
  </svg>
);

const TaskIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
    <path
      d="m4 7 2 2 4-4M13 7h7M4 14l2 2 4-4m3 3h7"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    />
  </svg>
);

export default function OperasyonOzeti({
  business,
  setActiveTab,
}: OperasyonOzetiProps) {
  const [data, setData] = useState<MiniSiteData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [referenceTime] = useState(() => Date.now());

  useEffect(() => {
    const loadOperations = async () => {
      if (!business.id) {
        setLoading(false);
        return;
      }

      try {
        const snapshot = await loadOperationalSnapshot(business.id);
        setData({
          appointments: snapshot.appointments ?? [],
          orders: snapshot.orders ?? [],
          tasks: snapshot.tasks ?? [],
        });
      } catch {
        setLoadError(true);
      }
      setLoading(false);
    };

    loadOperations();
  }, [business.id]);

  const summary = useMemo(() => {
    const appointments = data.appointments as Appointment[];
    const orders = data.orders as Order[];
    const tasks = data.tasks as StaffTask[];
    const today = new Date(referenceTime).toLocaleDateString("en-CA");

    return {
      todayAppointments: appointments.filter(
        (appointment) =>
          appointment.status === "planlandi" &&
          new Date(appointment.startsAt).toLocaleDateString("en-CA") === today,
      ).length,
      upcomingAppointments: appointments.filter(
        (appointment) =>
          appointment.status === "planlandi" &&
          new Date(appointment.startsAt).getTime() >= referenceTime,
      ).length,
      openOrders: orders.filter(
        (order) => !["teslim_edildi", "iptal"].includes(order.status),
      ).length,
      pendingPayment: orders
        .filter(
          (order) =>
            order.paymentStatus === "bekliyor" && order.status !== "iptal",
        )
        .reduce((sum, order) => sum + Number(order.total), 0),
      openTasks: tasks.filter((task) => task.status !== "tamamlandi").length,
      overdueTasks: tasks.filter(
        (task) =>
          task.status !== "tamamlandi" &&
          task.dueDate &&
          new Date(`${task.dueDate}T23:59:59`).getTime() < referenceTime,
      ).length,
    };
  }, [data, referenceTime]);

  const cards = [
    {
      title: "Randevular",
      icon: <CalendarIcon />,
      primary: `${summary.todayAppointments} bugün`,
      secondary: `${summary.upcomingAppointments} yaklaşan randevu`,
      tab: "randevu",
      color: "text-teal-700",
      iconBackground: "bg-teal-100",
    },
    {
      title: "Siparişler",
      icon: <OrderIcon />,
      primary: `${summary.openOrders} açık sipariş`,
      secondary: `${summary.pendingPayment.toLocaleString("tr-TR", {
        style: "currency",
        currency: "TRY",
        maximumFractionDigits: 0,
      })} bekleyen ödeme`,
      tab: "siparis",
      color: "text-indigo-700",
      iconBackground: "bg-indigo-100",
    },
    {
      title: "Görevler",
      icon: <TaskIcon />,
      primary: `${summary.openTasks} açık görev`,
      secondary: `${summary.overdueTasks} geciken görev`,
      tab: "personel",
      color: "text-slate-700",
      iconBackground: "bg-slate-200",
    },
  ];

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-indigo-600">
            Günlük Kontrol Merkezi
          </p>
          <h3 className="mt-1 text-xl font-black text-gray-900">
            Operasyon Özeti
          </h3>
        </div>
        <p className="text-sm text-gray-500">
          {loading && "Güncel durum yükleniyor..."}
          {loadError && "Operasyon verileri şu anda yüklenemedi."}
          {!loading && !loadError && "Bugünün iş yükü tek bakışta."}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <button
            key={card.tab}
            type="button"
            onClick={() => setActiveTab(card.tab)}
            className="group rounded-2xl border border-gray-100 bg-gray-50 p-5 text-left transition hover:-translate-y-0.5 hover:border-gray-200 hover:bg-white hover:shadow-md"
          >
            <div className="flex items-center justify-between gap-3">
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.iconBackground} ${card.color}`}
              >
                {card.icon}
              </span>
              <span className="text-sm font-bold text-gray-400 transition group-hover:text-gray-700">
                Aç
              </span>
            </div>
            <h4 className="mt-4 font-black text-gray-900">{card.title}</h4>
            <p className={`mt-2 text-lg font-black ${card.color}`}>
              {loading ? "..." : card.primary}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {loading ? "Hesaplanıyor" : card.secondary}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}
