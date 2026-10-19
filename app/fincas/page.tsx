"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Finca {
  finca_id: string;
  nombre_finca?: string;
  ubicacion?: string;
  estado_piloto?: string;
  animales_activos: number;
  alertas_activas: number;
  ultima_actividad: string | null;
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
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#0B4C4A]">Fincas</h1>
        <Link
          href="/fincas/nueva"
          className="rounded-lg bg-[#0B4C4A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d5a58]"
        >
          + Nueva finca
        </Link>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {!fincas && !error && <p className="text-sm text-[#6D7B77]">Cargando…</p>}

      {fincas && fincas.length === 0 && (
        <p className="text-sm text-[#6D7B77]">Todavía no hay ninguna finca creada.</p>
      )}

      {fincas && fincas.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-[#DDE5DD] bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#DDE5DD] text-left text-xs font-semibold uppercase tracking-wide text-[#9AA7A3]">
                <th className="px-4 py-3">Finca</th>
                <th className="px-4 py-3">Ubicación</th>
                <th className="px-4 py-3">Animales</th>
                <th className="px-4 py-3">Alertas</th>
                <th className="px-4 py-3">Última actividad</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {fincas.map((f) => (
                <tr key={f.finca_id} className="border-b border-[#DDE5DD] last:border-none">
                  <td className="px-4 py-3 font-medium text-[#0B4C4A]">
                    {f.nombre_finca ?? f.finca_id}
                    <div className="font-mono text-xs text-[#9AA7A3]">{f.finca_id}</div>
                  </td>
                  <td className="px-4 py-3 text-[#6D7B77]">{f.ubicacion ?? "—"}</td>
                  <td className="px-4 py-3 text-[#6D7B77]">{f.animales_activos}</td>
                  <td className="px-4 py-3 text-[#6D7B77]">{f.alertas_activas}</td>
                  <td className="px-4 py-3 text-[#6D7B77]">
                    {f.ultima_actividad ? new Date(f.ultima_actividad).toLocaleDateString("es-CO") : "Sin eventos"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-[#E7F3E3] px-2.5 py-1 text-xs font-medium text-[#1E4A1E]">
                      {f.estado_piloto ?? "ACTIVA"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
