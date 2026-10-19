"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Finca {
  finca_id: string;
  nombre_finca?: string;
  estado_piloto?: string;
  animales_activos: number;
  alertas_activas: number;
  ultima_actividad: string | null;
}

interface Piloto {
  id: string;
  created_at?: string;
}

function diasDesde(fechaIso: string | null): number | null {
  if (!fechaIso) return null;
  const dias = (Date.now() - new Date(fechaIso).getTime()) / (1000 * 60 * 60 * 24);
  return Math.floor(dias);
}

export default function DashboardPage() {
  const [fincas, setFincas] = useState<Finca[] | null>(null);
  const [pilotos, setPilotos] = useState<Piloto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/fincas").then((r) => r.json()),
      fetch("/api/pilotos").then((r) => r.json()),
    ])
      .then(([fincasData, pilotosData]) => {
        setFincas(fincasData.fincas ?? []);
        setPilotos(pilotosData.pilotos ?? []);
      })
      .catch(() => setError("No se pudo cargar el resumen"));
  }, []);

  if (error) return <p className="text-sm text-rose-600">{error}</p>;
  if (!fincas || !pilotos) return <p className="text-sm text-[#6D7B77]">Cargando…</p>;

  const totalAnimales = fincas.reduce((acc, f) => acc + f.animales_activos, 0);
  const totalAlertas = fincas.reduce((acc, f) => acc + f.alertas_activas, 0);
  const fincasEnSilencio = fincas.filter((f) => {
    const dias = diasDesde(f.ultima_actividad);
    return dias === null || dias > 7;
  });

  const kpis = [
    { label: "Fincas activas", value: fincas.length },
    { label: "Animales registrados", value: totalAnimales },
    { label: "Alertas activas", value: totalAlertas },
    { label: "Postulaciones sin convertir", value: pilotos.length },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#0B4C4A]">Resumen</h1>
        <Link
          href="/fincas/nueva"
          className="rounded-lg bg-[#0B4C4A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d5a58]"
        >
          + Nueva finca
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-[#DDE5DD] bg-white p-4">
            <p className="text-2xl font-bold text-[#0B4C4A]">{kpi.value}</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-[#9AA7A3]">{kpi.label}</p>
          </div>
        ))}
      </div>

      {fincasEnSilencio.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">
            {fincasEnSilencio.length} finca{fincasEnSilencio.length === 1 ? "" : "s"} sin actividad hace más de 7 días
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {fincasEnSilencio.map((f) => (
              <li key={f.finca_id} className="text-sm text-amber-700">
                <Link href={`/fincas`} className="underline">
                  {f.nombre_finca ?? f.finca_id}
                </Link>
                {" — "}
                {f.ultima_actividad ? `última actividad hace ${diasDesde(f.ultima_actividad)} días` : "sin eventos registrados"}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
