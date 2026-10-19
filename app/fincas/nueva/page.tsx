"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function NuevaFincaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [nombreFinca, setNombreFinca] = useState(searchParams.get("finca") ?? "");
  const [ubicacion, setUbicacion] = useState(searchParams.get("ubicacion") ?? "");
  const [tamanoHato, setTamanoHato] = useState("");
  const [telefonoAdmin, setTelefonoAdmin] = useState(searchParams.get("whatsapp") ?? "");
  const [nombreAdmin, setNombreAdmin] = useState(searchParams.get("nombre") ?? "");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<{ finca_id: string; password_temporal: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/fincas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre_finca: nombreFinca.trim(),
          ubicacion: ubicacion.trim() || undefined,
          tamano_hato_aprox: tamanoHato ? parseInt(tamanoHato, 10) : undefined,
          telefono_admin: telefonoAdmin.trim(),
          nombre_admin: nombreAdmin.trim(),
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body?.error ?? `Error ${res.status}`);
        return;
      }
      setResultado(body);
      toast.success(`Finca ${body.finca_id} creada`);
    } catch {
      toast.error("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  }

  if (resultado) {
    return (
      <div className="max-w-lg animate-scale-in">
        <Card style={{ backgroundColor: "#E7F3E3", borderColor: "#CFE6CB" }}>
          <CardHeader>
            <CardTitle style={{ color: "#0B4C4A" }}>Finca {resultado.finca_id} creada</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm" style={{ color: "#1E4A1E" }}>
              Contraseña temporal para {telefonoAdmin} (cópiela y compártasela — no se vuelve a mostrar):
            </p>
            <code className="block rounded-lg bg-white px-3 py-2 font-mono text-sm" style={{ color: "#0B4C4A" }}>
              {resultado.password_temporal}
            </code>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(resultado.password_temporal);
                  toast.success("Contraseña copiada");
                }}
              >
                Copiar contraseña
              </Button>
              <Button size="sm" onClick={() => router.push("/fincas")}>
                Ver fincas
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: "#1F2937", letterSpacing: "-0.025em" }}>
          Nueva finca
        </h1>
        <p className="mt-1.5 text-[15px]" style={{ color: "#6D7B77" }}>
          Crea la finca y su primer usuario administrador en un solo paso.
        </p>
      </div>

      <Card className="max-w-lg animate-fade-in-up">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nombre_finca">Nombre de la finca</Label>
              <Input id="nombre_finca" type="text" value={nombreFinca} onChange={(e) => setNombreFinca(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ubicacion">Ubicación (opcional)</Label>
              <Input id="ubicacion" type="text" value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tamano">Tamaño aproximado del hato (opcional)</Label>
              <Input id="tamano" type="number" min="0" value={tamanoHato} onChange={(e) => setTamanoHato(e.target.value)} />
            </div>

            <div className="space-y-3 rounded-xl p-4" style={{ backgroundColor: "#F5F7F4", border: "1px solid #DDE5DD" }}>
              <p className="text-[13px] font-semibold" style={{ color: "#6D7B77" }}>
                Primer usuario (administrador de la finca)
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="nombre_admin">Nombre</Label>
                <Input id="nombre_admin" type="text" value={nombreAdmin} onChange={(e) => setNombreAdmin(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="telefono_admin">WhatsApp (formato +573...)</Label>
                <Input
                  id="telefono_admin"
                  type="text"
                  placeholder="+573001234567"
                  value={telefonoAdmin}
                  onChange={(e) => setTelefonoAdmin(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Creando…" : "Crear finca"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function NuevaFincaPage() {
  return (
    <Suspense>
      <NuevaFincaForm />
    </Suspense>
  );
}
