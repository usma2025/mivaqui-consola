"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FincaMatch {
  finca_id: string;
  nombre_finca?: string;
}

interface AnimalMatch {
  finca_id: string;
  arete_id: string;
  categoria?: string;
}

function BuscarResultados() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const [resultado, setResultado] = useState<{ fincas: FincaMatch[]; animales: AnimalMatch[] } | null>(null);
  const [cargandoQuery, setCargandoQuery] = useState<string | null>(null);

  useEffect(() => {
    if (q.trim().length < 2) return;
    let cancelado = false;
    setTimeout(() => {
      if (cancelado) return;
      setCargandoQuery(q);
    }, 0);
    fetch(`/api/buscar?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelado) setResultado(data);
      })
      .finally(() => {
        if (!cancelado) setCargandoQuery((actual) => (actual === q ? null : actual));
      });
    return () => {
      cancelado = true;
    };
  }, [q]);

  const busquedaValida = q.trim().length >= 2;
  const cargando = cargandoQuery === q;
  const sinResultados = busquedaValida && !cargando && resultado && resultado.fincas.length === 0 && resultado.animales.length === 0;

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: "#1F2937", letterSpacing: "-0.025em" }}>
          Resultados para &ldquo;{q}&rdquo;
        </h1>
      </div>

      {q.trim().length < 2 && (
        <p className="text-sm" style={{ color: "#9AA7A3" }}>Escribe al menos 2 caracteres para buscar.</p>
      )}
      {cargando && <p className="text-sm" style={{ color: "#9AA7A3" }}>Buscando…</p>}
      {sinResultados && <p className="text-sm" style={{ color: "#9AA7A3" }}>Sin resultados.</p>}

      {busquedaValida && resultado && resultado.fincas.length > 0 && (
        <Card className="animate-fade-in-up">
          <CardHeader><CardTitle className="text-base">Fincas</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {resultado.fincas.map((f) => (
                <li key={f.finca_id} className="text-sm">
                  <Link href={`/fincas/${f.finca_id}`} className="font-semibold hover:underline" style={{ color: "#0B4C4A" }}>
                    {f.nombre_finca ?? f.finca_id}
                  </Link>
                  <span className="ml-2 font-mono text-xs" style={{ color: "#9AA7A3" }}>{f.finca_id}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {busquedaValida && resultado && resultado.animales.length > 0 && (
        <Card className="animate-fade-in-up">
          <CardHeader><CardTitle className="text-base">Animales</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {resultado.animales.map((a) => (
                <li key={`${a.finca_id}-${a.arete_id}`} className="text-sm">
                  <span className="font-semibold" style={{ color: "#1F2937" }}>Arete {a.arete_id}</span>
                  {a.categoria && <span style={{ color: "#6D7B77" }}> · {a.categoria}</span>}
                  {" — "}
                  <Link href={`/fincas/${a.finca_id}`} className="hover:underline" style={{ color: "#0B4C4A" }}>
                    {a.finca_id}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function BuscarPage() {
  return (
    <Suspense>
      <BuscarResultados />
    </Suspense>
  );
}
