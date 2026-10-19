"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Piloto {
  id: string;
  nombre?: string;
  finca?: string;
  ubicacion?: string;
  whatsapp?: string;
  tipoGanaderia?: string;
  cantidadAnimales?: string;
  created_at?: string;
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

export default function PilotosPage() {
  const [pilotos, setPilotos] = useState<Piloto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/pilotos")
      .then((r) => r.json())
      .then((data) => setPilotos(data.pilotos ?? []))
      .catch(() => setError("No se pudo cargar las postulaciones"));
  }, []);

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: "#1F2937", letterSpacing: "-0.025em" }}>
          Postulaciones al piloto
        </h1>
        <p className="mt-1.5 text-[15px]" style={{ color: "#6D7B77" }}>
          Formulario del landing (mivaqui.com/postulacion).
        </p>
      </div>

      {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
      {!pilotos && !error && <TableSkeleton />}

      {pilotos && pilotos.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl py-16 text-center" style={{ border: "1px solid #DDE5DD" }}>
          <p className="font-semibold" style={{ color: "#1F2937" }}>Todavía no hay postulaciones desde el landing</p>
        </div>
      )}

      {pilotos && pilotos.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Finca</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>Tipo / Animales</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pilotos.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-semibold" style={{ color: "#0B4C4A" }}>{p.nombre ?? "—"}</TableCell>
                <TableCell style={{ color: "#6D7B77" }}>
                  {p.finca ?? "—"}
                  {p.ubicacion && <div className="text-xs" style={{ color: "#9AA7A3" }}>{p.ubicacion}</div>}
                </TableCell>
                <TableCell className="font-mono text-xs" style={{ color: "#6D7B77" }}>{p.whatsapp ?? "—"}</TableCell>
                <TableCell style={{ color: "#6D7B77" }}>
                  {p.tipoGanaderia ?? "—"}
                  {p.cantidadAnimales && <div className="text-xs" style={{ color: "#9AA7A3" }}>{p.cantidadAnimales}</div>}
                </TableCell>
                <TableCell style={{ color: "#6D7B77" }}>
                  {p.created_at ? new Date(p.created_at).toLocaleDateString("es-CO") : "—"}
                </TableCell>
                <TableCell>
                  <Link
                    href={{
                      pathname: "/fincas/nueva",
                      query: {
                        finca: p.finca ?? "",
                        ubicacion: p.ubicacion ?? "",
                        nombre: p.nombre ?? "",
                        whatsapp: p.whatsapp ? `+${p.whatsapp}` : "",
                      },
                    }}
                  >
                    <Button variant="outline" size="sm">Convertir a finca</Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
