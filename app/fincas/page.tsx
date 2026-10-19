"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Finca {
  finca_id: string;
  nombre_finca?: string;
  ubicacion?: string;
  estado_piloto?: string;
  animales_activos: number;
  alertas_activas: number;
  ultima_actividad: string | null;
}

function TableSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #DDE5DD" }}>
      <div className="h-11 skeleton" style={{ borderBottom: "1px solid #DDE5DD" }} />
      {[0, 1, 2].map((i) => (
        <div key={i} className={`h-14 skeleton ${i % 2 === 1 ? "opacity-70" : ""}`} style={{ borderBottom: "1px solid #DDE5DD" }} />
      ))}
    </div>
  );
}

export default function FincasPage() {
  const [fincas, setFincas] = useState<Finca[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/fincas")
      .then((r) => r.json())
      .then((data) => setFincas(data.fincas ?? []))
      .catch(() => setError("No se pudo cargar el listado de fincas"));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between animate-fade-in-up">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: "#1F2937", letterSpacing: "-0.025em" }}>
            Fincas
          </h1>
          <p className="mt-1.5 text-[15px]" style={{ color: "#6D7B77" }}>
            {fincas ? `${fincas.length} finca${fincas.length === 1 ? "" : "s"} en el piloto` : "Listado de todas las fincas"}
          </p>
        </div>
        <Link href="/fincas/nueva">
          <Button size="sm">+ Nueva finca</Button>
        </Link>
      </div>

      {error && <p className="text-sm font-medium text-rose-600">{error}</p>}

      {!fincas && !error && <TableSkeleton />}

      {fincas && fincas.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl py-16 text-center" style={{ border: "1px solid #DDE5DD" }}>
          <p className="font-semibold" style={{ color: "#1F2937" }}>Todavía no hay ninguna finca creada</p>
          <Link href="/fincas/nueva">
            <Button size="sm">+ Nueva finca</Button>
          </Link>
        </div>
      )}

      {fincas && fincas.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Finca</TableHead>
              <TableHead>Ubicación</TableHead>
              <TableHead>Animales</TableHead>
              <TableHead>Alertas</TableHead>
              <TableHead>Última actividad</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fincas.map((f) => (
              <TableRow key={f.finca_id}>
                <TableCell className="font-semibold" style={{ color: "#0B4C4A" }}>
                  {f.nombre_finca ?? f.finca_id}
                  <div className="font-mono text-xs font-normal" style={{ color: "#9AA7A3" }}>{f.finca_id}</div>
                </TableCell>
                <TableCell style={{ color: "#6D7B77" }}>{f.ubicacion ?? "—"}</TableCell>
                <TableCell className="tabular-nums font-medium">{f.animales_activos}</TableCell>
                <TableCell className="tabular-nums font-medium">
                  {f.alertas_activas > 0 ? (
                    <Badge variant="yellow">{f.alertas_activas}</Badge>
                  ) : (
                    <span style={{ color: "#B3C4B0" }}>0</span>
                  )}
                </TableCell>
                <TableCell style={{ color: "#6D7B77" }}>
                  {f.ultima_actividad ? new Date(f.ultima_actividad).toLocaleDateString("es-CO") : "Sin eventos"}
                </TableCell>
                <TableCell>
                  <Badge variant="green">{f.estado_piloto ?? "ACTIVA"}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
