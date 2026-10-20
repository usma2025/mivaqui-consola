"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

interface AlertaConFinca {
  alerta_sk: string;
  arete_id?: string;
  tipo_alerta?: string;
  descripcion?: string;
  fecha_alerta?: string;
  finca_nombre?: string;
}

function TableSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #DDE5DD" }}>
      <div className="h-11 skeleton" style={{ borderBottom: "1px solid #DDE5DD" }} />
      {[0, 1, 2].map((i) => (
        <div key={i} className={`h-16 skeleton ${i % 2 === 1 ? "opacity-70" : ""}`} style={{ borderBottom: "1px solid #DDE5DD" }} />
      ))}
    </div>
  );
}

export default function AlertasPage() {
  const [alertas, setAlertas] = useState<AlertaConFinca[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/alertas")
      .then((r) => r.json())
      .then((data) => setAlertas(data.alertas ?? []))
      .catch(() => setError("No se pudo cargar las alertas"));
  }, []);

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: "#1F2937", letterSpacing: "-0.025em" }}>
          Alertas
        </h1>
        <p className="mt-1.5 text-[15px]" style={{ color: "#6D7B77" }}>
          Todas las alertas activas, de todas las fincas, en un solo lugar.
        </p>
      </div>

      {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
      {!alertas && !error && <TableSkeleton />}

      {alertas && alertas.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl py-16 text-center" style={{ border: "1px solid #DDE5DD" }}>
          <p className="font-semibold" style={{ color: "#1F2937" }}>Ninguna finca tiene alertas activas ahora mismo</p>
        </div>
      )}

      {alertas && alertas.length > 0 && (
        <ul className="stagger space-y-3">
          {alertas.map((a) => (
            <li
              key={a.alerta_sk + a.finca_nombre}
              className="animate-fade-in-up flex items-start gap-4 rounded-xl p-4"
              style={{ border: "1px solid #DDE5DD", backgroundColor: "#FFFFFF" }}
            >
              <Badge variant="yellow">{a.tipo_alerta}</Badge>
              <div className="flex-1">
                <p className="text-sm" style={{ color: "#1F2937" }}>{a.descripcion}</p>
                <p className="mt-1 text-xs" style={{ color: "#9AA7A3" }}>
                  {a.finca_nombre}
                  {a.arete_id && a.arete_id !== "GENERAL" && ` · Arete ${a.arete_id}`}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
