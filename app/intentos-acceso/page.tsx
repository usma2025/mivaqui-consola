"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/lib/auth-context";

interface IntentoAcceso {
  identificador: string;
  ultimo_mensaje?: string;
  veces?: number;
  primera_vez?: string;
  ultima_vez?: string;
}

interface FincaOpcion {
  finca_id: string;
  nombre_finca?: string;
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

function AutorizarForm({
  identificador,
  fincas,
  onDone,
}: {
  identificador: string;
  fincas: FincaOpcion[];
  onDone: () => void;
}) {
  const [fincaId, setFincaId] = useState(fincas[0]?.finca_id ?? "");
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState("LECTURA");
  const [enviando, setEnviando] = useState(false);

  async function autorizar() {
    if (!fincaId) {
      toast.error("Elige una finca");
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch(`/api/intentos-acceso/${encodeURIComponent(identificador)}/autorizar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finca_id: fincaId, nombre: nombre || undefined, rol }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? `Error ${res.status}`);
      toast.success(`Autorizado hacia ${fincaId}`);
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo autorizar");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="space-y-1">
        <Label htmlFor={`finca-${identificador}`}>Finca</Label>
        <Select id={`finca-${identificador}`} value={fincaId} onChange={(e) => setFincaId(e.target.value)}>
          {fincas.map((f) => (
            <option key={f.finca_id} value={f.finca_id}>
              {f.finca_id}{f.nombre_finca ? ` — ${f.nombre_finca}` : ""}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`nombre-${identificador}`}>Nombre (opcional)</Label>
        <Input
          id={`nombre-${identificador}`}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Mayordomo"
          className="w-36"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`rol-${identificador}`}>Rol</Label>
        <Select id={`rol-${identificador}`} value={rol} onChange={(e) => setRol(e.target.value)}>
          <option value="LECTURA">Lectura</option>
          <option value="ADMIN">Admin</option>
        </Select>
      </div>
      <Button size="sm" disabled={enviando} onClick={autorizar}>
        {enviando ? "Autorizando…" : "Autorizar"}
      </Button>
    </div>
  );
}

export default function IntentosAccesoPage() {
  const { esAdmin } = useAuth();
  const [intentos, setIntentos] = useState<IntentoAcceso[] | null>(null);
  const [fincas, setFincas] = useState<FincaOpcion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState<string | null>(null);

  function cargar() {
    fetch("/api/intentos-acceso")
      .then((r) => r.json())
      .then((data) => setIntentos(data.intentos ?? []))
      .catch(() => setError("No se pudo cargar la bandeja de intentos"));
  }

  useEffect(() => {
    cargar();
    fetch("/api/fincas")
      .then((r) => r.json())
      .then((data) => setFincas(data.fincas ?? []))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: "#1F2937", letterSpacing: "-0.025em" }}>
          Intentos sin autorizar
        </h1>
        <p className="mt-1.5 text-[15px]" style={{ color: "#6D7B77" }}>
          Identificadores de WhatsApp (teléfono o BSUID, para ganaderos con &quot;username&quot; activado) que
          escribieron al bot sin estar autorizados, de todas las fincas.
        </p>
      </div>

      {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
      {!intentos && !error && <TableSkeleton />}

      {intentos && intentos.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl py-16 text-center" style={{ border: "1px solid #DDE5DD" }}>
          <p className="font-semibold" style={{ color: "#1F2937" }}>No hay intentos pendientes</p>
        </div>
      )}

      {intentos && intentos.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Identificador</TableHead>
              <TableHead>Último mensaje</TableHead>
              <TableHead>Veces</TableHead>
              <TableHead>Última vez</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {intentos.map((intento) => (
              <TableRow key={intento.identificador}>
                <TableCell className="font-mono text-xs" style={{ color: "#6D7B77" }}>{intento.identificador}</TableCell>
                <TableCell className="max-w-xs truncate" style={{ color: "#6D7B77" }}>{intento.ultimo_mensaje ?? "—"}</TableCell>
                <TableCell style={{ color: "#6D7B77" }}>{intento.veces ?? 1}</TableCell>
                <TableCell style={{ color: "#6D7B77" }}>
                  {intento.ultima_vez ? new Date(intento.ultima_vez).toLocaleString("es-CO") : "—"}
                </TableCell>
                <TableCell>
                  {!esAdmin ? null : abierto === intento.identificador ? (
                    <AutorizarForm
                      identificador={intento.identificador}
                      fincas={fincas}
                      onDone={() => {
                        setAbierto(null);
                        cargar();
                      }}
                    />
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setAbierto(intento.identificador)}>
                      Autorizar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
