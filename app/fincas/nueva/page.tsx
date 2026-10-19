"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

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
      <div className="max-w-lg rounded-2xl border border-[#CFE6CB] bg-[#E7F3E3] p-6">
        <h2 className="text-lg font-bold text-[#0B4C4A]">Finca {resultado.finca_id} creada</h2>
        <p className="mt-2 text-sm text-[#1E4A1E]">
          Contraseña temporal para {telefonoAdmin} (cópiela y compártasela — no se vuelve a mostrar):
        </p>
        <code className="mt-2 block rounded-lg bg-white px-3 py-2 font-mono text-sm text-[#0B4C4A]">
          {resultado.password_temporal}
        </code>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(resultado.password_temporal);
              toast.success("Contraseña copiada");
            }}
            className="rounded-lg border border-[#0B4C4A] px-3 py-1.5 text-sm font-medium text-[#0B4C4A]"
          >
            Copiar contraseña
          </button>
          <button
            type="button"
            onClick={() => router.push("/fincas")}
            className="rounded-lg bg-[#0B4C4A] px-3 py-1.5 text-sm font-medium text-white"
          >
            Ver fincas
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-[#0B4C4A]">Nueva finca</h1>
      <form onSubmit={handleSubmit} className="flex max-w-lg flex-col gap-4">
        <Field label="Nombre de la finca">
          <input
            type="text"
            value={nombreFinca}
            onChange={(e) => setNombreFinca(e.target.value)}
            required
            className="rounded-lg border border-[#DDE5DD] px-3 py-2 text-sm outline-none focus:border-[#53B04B]"
          />
        </Field>
        <Field label="Ubicación (opcional)">
          <input
            type="text"
            value={ubicacion}
            onChange={(e) => setUbicacion(e.target.value)}
            className="rounded-lg border border-[#DDE5DD] px-3 py-2 text-sm outline-none focus:border-[#53B04B]"
          />
        </Field>
        <Field label="Tamaño aproximado del hato (opcional)">
          <input
            type="number"
            min="0"
            value={tamanoHato}
            onChange={(e) => setTamanoHato(e.target.value)}
            className="rounded-lg border border-[#DDE5DD] px-3 py-2 text-sm outline-none focus:border-[#53B04B]"
          />
        </Field>

        <div className="mt-2 rounded-xl border border-[#DDE5DD] bg-[#F5F7F4] p-4">
          <p className="mb-3 text-[13px] font-semibold text-[#6D7B77]">Primer usuario (administrador de la finca)</p>
          <div className="flex flex-col gap-3">
            <Field label="Nombre">
              <input
                type="text"
                value={nombreAdmin}
                onChange={(e) => setNombreAdmin(e.target.value)}
                required
                className="rounded-lg border border-[#DDE5DD] bg-white px-3 py-2 text-sm outline-none focus:border-[#53B04B]"
              />
            </Field>
            <Field label="WhatsApp (formato +573...)">
              <input
                type="text"
                value={telefonoAdmin}
                onChange={(e) => setTelefonoAdmin(e.target.value)}
                placeholder="+573001234567"
                required
                className="rounded-lg border border-[#DDE5DD] bg-white px-3 py-2 text-sm outline-none focus:border-[#53B04B]"
              />
            </Field>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-lg bg-[#0B4C4A] py-2.5 text-sm font-semibold text-white hover:bg-[#0d5a58] disabled:opacity-60"
        >
          {loading ? "Creando…" : "Crear finca"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-medium text-[#6D7B77]">{label}</label>
      {children}
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
