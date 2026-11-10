"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

interface AuditoriaItem {
  finca_id: string;
  timestamp: string;
  usuario: string;
  accion: string;
  detalle?: string;
}

const ACCIONES_LABEL: Record<string, string> = {
  crear_finca: "Creó la finca",
  cambiar_estado: "Cambió el estado",
  agregar_nota: "Agregó una nota",
  agregar_usuario: "Agregó un usuario",
  desactivar_usuario: "Desactivó un usuario",
  convertir_postulacion: "Convirtió una postulación",
};

function TableSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #DDE5DD" }}>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={`h-14 skeleton ${i % 2 === 1 ? "opacity-70" : ""}`} style={{ borderBottom: "1px solid #DDE5DD" }} />
      ))}
    </div>
  );
}

export default function AuditoriaPage() {
  const [auditoria, setAuditoria] = useState<AuditoriaItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auditoria")
      .then((r) => r.json())
      .then((data) => setAuditoria(data.auditoria ?? []))
      .catch(() => setError("No se pudo cargar la auditoría"));
  }, []);

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: "#1F2937", letterSpacing: "-0.025em" }}>
          Auditoría
        </h1>
        <p className="mt-1.5 text-[15px]" style={{ color: "#6D7B77" }}>
          Quién hizo qué desde el panel, de todas las fincas, más reciente primero.
        </p>
      </div>

      {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
      {!auditoria && !error && <TableSkeleton />}

      {auditoria && auditoria.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl py-16 text-center" style={{ border: "1px solid #DDE5DD" }}>
          <p className="font-semibold" style={{ color: "#1F2937" }}>Todavía no hay acciones registradas</p>
        </div>
      )}

      {auditoria && auditoria.length > 0 && (
        <Card className="animate-fade-in-up">
          <CardContent className="p-0">
            <ul>
              {auditoria.map((a) => (
                <li
                  key={a.timestamp}
                  className="flex items-start justify-between gap-4 p-4 text-sm"
                  style={{ borderBottom: "1px solid #DDE5DD" }}
                >
                  <span style={{ color: "#1F2937" }}>
                    <span className="font-semibold">{a.usuario}</span>
                    {" — "}
                    {ACCIONES_LABEL[a.accion] ?? a.accion}
                    {" en "}
                    <Link href={`/fincas/${a.finca_id}`} className="font-mono text-xs hover:underline" style={{ color: "#0B4C4A" }}>
                      {a.finca_id}
                    </Link>
                    {a.detalle && <span style={{ color: "#6D7B77" }}> ({a.detalle})</span>}
                  </span>
                  <span className="shrink-0 font-mono text-xs" style={{ color: "#9AA7A3" }}>
                    {new Date(a.timestamp.split("#")[0]).toLocaleString("es-CO")}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
