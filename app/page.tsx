"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-24 rounded-2xl skeleton" style={{ animationDelay: `${i * 80}ms` }} />
      ))}
    </div>
  );
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

  const header = (
    <div className="flex items-start justify-between animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: "#1F2937", letterSpacing: "-0.025em" }}>
          Resumen
        </h1>
        <p className="mt-1.5 text-[15px]" style={{ color: "#6D7B77" }}>
          Estado general de todas las fincas del piloto.
        </p>
      </div>
      <Link href="/fincas/nueva">
        <Button size="sm">+ Nueva finca</Button>
      </Link>
    </div>
  );

  if (error) {
    return (
      <div className="space-y-6">
        {header}
        <p className="text-sm font-medium text-rose-600">{error}</p>
      </div>
    );
  }

  if (!fincas || !pilotos) {
    return (
      <div className="space-y-6">
        {header}
        <KpiSkeleton />
      </div>
    );
  }

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
    <div className="space-y-6">
      {header}

      <div className="stagger grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="animate-fade-in-up p-5">
            <p className="text-3xl font-bold" style={{ color: "#0B4C4A" }}>{kpi.value}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide" style={{ color: "#9AA7A3" }}>
              {kpi.label}
            </p>
          </Card>
        ))}
      </div>

      {fincasEnSilencio.length > 0 && (
        <Card
          className="animate-fade-in-up p-5"
          style={{ backgroundColor: "#fffbeb", borderColor: "#fde68a" }}
        >
          <p className="text-sm font-semibold" style={{ color: "#92400e" }}>
            {fincasEnSilencio.length} finca{fincasEnSilencio.length === 1 ? "" : "s"} sin actividad hace más de 7 días
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {fincasEnSilencio.map((f) => (
              <li key={f.finca_id} className="text-sm" style={{ color: "#92400e" }}>
                <Link href="/fincas" className="underline">
                  {f.nombre_finca ?? f.finca_id}
                </Link>
                {" — "}
                {f.ultima_actividad ? `última actividad hace ${diasDesde(f.ultima_actividad)} días` : "sin eventos registrados"}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
