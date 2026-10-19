"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-[#0B4C4A]">Postulaciones al piloto</h1>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {!pilotos && !error && <p className="text-sm text-[#6D7B77]">Cargando…</p>}
      {pilotos && pilotos.length === 0 && (
        <p className="text-sm text-[#6D7B77]">Todavía no hay postulaciones desde el landing.</p>
      )}

      {pilotos && pilotos.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-[#DDE5DD] bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#DDE5DD] text-left text-xs font-semibold uppercase tracking-wide text-[#9AA7A3]">
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Finca</th>
                <th className="px-4 py-3">WhatsApp</th>
                <th className="px-4 py-3">Tipo / Animales</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {pilotos.map((p) => (
                <tr key={p.id} className="border-b border-[#DDE5DD] last:border-none">
                  <td className="px-4 py-3 font-medium text-[#0B4C4A]">{p.nombre ?? "—"}</td>
                  <td className="px-4 py-3 text-[#6D7B77]">
                    {p.finca ?? "—"}
                    {p.ubicacion && <div className="text-xs text-[#9AA7A3]">{p.ubicacion}</div>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[#6D7B77]">{p.whatsapp ?? "—"}</td>
                  <td className="px-4 py-3 text-[#6D7B77]">
                    {p.tipoGanaderia ?? "—"}
                    {p.cantidadAnimales && <div className="text-xs text-[#9AA7A3]">{p.cantidadAnimales}</div>}
                  </td>
                  <td className="px-4 py-3 text-[#6D7B77]">
                    {p.created_at ? new Date(p.created_at).toLocaleDateString("es-CO") : "—"}
                  </td>
                  <td className="px-4 py-3">
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
                      className="rounded-lg border border-[#0B4C4A] px-3 py-1.5 text-xs font-medium text-[#0B4C4A] hover:bg-[#0B4C4A] hover:text-white"
                    >
                      Convertir a finca
                    </Link>
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
