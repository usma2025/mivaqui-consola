"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendChart } from "@/components/TrendChart";
import { useAuth } from "@/lib/auth-context";

interface Finca {
  finca_id: string;
  nombre_finca?: string;
  ubicacion?: string;
  tamano_hato_aprox?: number;
  estado_piloto?: string;
  creado_en?: string;
  notas?: { fecha: string; texto: string }[];
}

interface Alerta {
  alerta_sk: string;
  arete_id?: string;
  tipo_alerta?: string;
  descripcion?: string;
  fecha_alerta?: string;
}

interface Evento {
  arete_id?: string;
  tipo_evento?: string;
  fecha_evento?: string;
  fecha_creacion?: string;
  registrado_por?: string;
}

interface Potrero {
  potrero_id: string;
  nombre?: string;
  area_hectareas?: number;
  capacidad_animales?: number;
}

interface Usuario {
  telefono: string;
  nombre?: string;
  rol?: string;
  activo?: boolean;
  modo_respuesta?: string;
}

interface CostoDiario {
  fecha: string;
  openai_llamadas?: number;
  whatsapp_mensajes_enviados?: number;
  whatsapp_mensajes_recibidos?: number;
}

interface ResumenCostos {
  dias: CostoDiario[];
  total_openai_llamadas: number;
  total_whatsapp_mensajes: number;
  total_whatsapp_recibidos: number;
}

interface PuntoTrend {
  fecha: string;
  cantidad: number;
}

interface AuditoriaItem {
  timestamp: string;
  usuario: string;
  accion: string;
  detalle?: string;
}

interface Detalle {
  finca: Finca;
  animales_activos: number;
  alertas: Alerta[];
  eventos_recientes: Evento[];
  potreros: Potrero[];
  usuarios: Usuario[];
  costos: ResumenCostos;
  eventos_por_dia: PuntoTrend[];
  auditoria: AuditoriaItem[];
}

const ACCIONES_LABEL: Record<string, string> = {
  crear_finca: "Creó la finca",
  cambiar_estado: "Cambió el estado",
  agregar_nota: "Agregó una nota",
  agregar_usuario: "Agregó un usuario",
  desactivar_usuario: "Desactivó un usuario",
  convertir_postulacion: "Convirtió una postulación",
};

const ESTADOS: { value: string; label: string }[] = [
  { value: "ACTIVA", label: "Activa" },
  { value: "PAUSADA", label: "Pausada" },
  { value: "CHURN", label: "Churn" },
];

const ESTADO_BADGE: Record<string, "green" | "yellow" | "red"> = {
  ACTIVA: "green",
  PAUSADA: "yellow",
  CHURN: "red",
};

export default function FichaFincaPage({ params }: { params: Promise<{ finca_id: string }> }) {
  const { finca_id } = use(params);
  const { esAdmin } = useAuth();
  const [detalle, setDetalle] = useState<Detalle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nuevoEstado, setNuevoEstado] = useState("");
  const [nuevaNota, setNuevaNota] = useState("");
  const [nuevoUsuario, setNuevoUsuario] = useState({ nombre: "", telefono: "", rol: "LECTURA", modo_respuesta: "TEXTO" });
  const [passwordMostrada, setPasswordMostrada] = useState<{ telefono: string; password: string } | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function cargar() {
    try {
      const res = await fetch(`/api/fincas/${finca_id}`);
      if (!res.ok) {
        setError(res.status === 404 ? "Finca no encontrada" : "No se pudo cargar la finca");
        return;
      }
      const data = await res.json();
      setDetalle(data);
      setNuevoEstado(data.finca.estado_piloto ?? "ACTIVA");
    } catch {
      setError("No se pudo conectar con el servidor");
    }
  }

  useEffect(() => {
    // cargar() es async -- los setState ocurren después del await del
    // fetch, no síncronamente dentro del efecto (el análisis estático del
    // lint no distingue eso cuando la función está definida afuera).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finca_id]);

  async function actualizarFinca(payload: Record<string, unknown>) {
    setGuardando(true);
    try {
      const res = await fetch(`/api/fincas/${finca_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body?.error ?? `Error ${res.status}`);
        return false;
      }
      await cargar();
      return true;
    } catch {
      toast.error("No se pudo conectar con el servidor");
      return false;
    } finally {
      setGuardando(false);
    }
  }

  async function handleAgregarUsuario(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    try {
      const res = await fetch(`/api/fincas/${finca_id}/usuarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nuevoUsuario),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body?.error ?? `Error ${res.status}`);
        return;
      }
      setPasswordMostrada({ telefono: nuevoUsuario.telefono, password: body.password_temporal });
      setNuevoUsuario({ nombre: "", telefono: "", rol: "LECTURA", modo_respuesta: "TEXTO" });
      toast.success("Usuario agregado");
      await cargar();
    } catch {
      toast.error("No se pudo conectar con el servidor");
    } finally {
      setGuardando(false);
    }
  }

  async function handleDesactivarUsuario(telefono: string) {
    if (!confirm(`¿Desactivar a ${telefono}?`)) return;
    try {
      const res = await fetch(`/api/fincas/${finca_id}/usuarios/${encodeURIComponent(telefono)}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body?.error ?? `Error ${res.status}`);
        return;
      }
      toast.success("Usuario desactivado");
      await cargar();
    } catch {
      toast.error("No se pudo conectar con el servidor");
    }
  }

  if (error) {
    return (
      <div className="space-y-4">
        <p className="text-sm font-medium text-rose-600">{error}</p>
        <Link href="/fincas" className="text-sm underline" style={{ color: "#0B4C4A" }}>← Volver a fincas</Link>
      </div>
    );
  }

  if (!detalle) {
    return <p className="text-sm" style={{ color: "#6D7B77" }}>Cargando…</p>;
  }

  const { finca, animales_activos, alertas, eventos_recientes, potreros, usuarios, costos, eventos_por_dia, auditoria } =
    detalle;

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <Link href="/fincas" className="text-xs font-medium underline" style={{ color: "#6D7B77" }}>← Fincas</Link>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: "#1F2937", letterSpacing: "-0.025em" }}>
            {finca.nombre_finca ?? finca.finca_id}
          </h1>
          <Badge variant={ESTADO_BADGE[finca.estado_piloto ?? "ACTIVA"] ?? "gray"}>{finca.estado_piloto ?? "ACTIVA"}</Badge>
        </div>
        <p className="mt-1 font-mono text-xs" style={{ color: "#9AA7A3" }}>{finca.finca_id}</p>
      </div>

      <div className="stagger grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="animate-fade-in-up p-5">
          <p className="text-2xl font-bold" style={{ color: "#0B4C4A" }}>{animales_activos}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide" style={{ color: "#9AA7A3" }}>Animales</p>
        </Card>
        <Card className="animate-fade-in-up p-5">
          <p className="text-2xl font-bold" style={{ color: "#0B4C4A" }}>{alertas.length}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide" style={{ color: "#9AA7A3" }}>Alertas activas</p>
        </Card>
        <Card className="animate-fade-in-up p-5">
          <p className="text-2xl font-bold" style={{ color: "#0B4C4A" }}>{potreros.length}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide" style={{ color: "#9AA7A3" }}>Potreros</p>
        </Card>
        <Card className="animate-fade-in-up p-5">
          <p className="text-2xl font-bold" style={{ color: "#0B4C4A" }}>{usuarios.filter((u) => u.activo).length}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide" style={{ color: "#9AA7A3" }}>Usuarios activos</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Perfil + estado del piloto */}
        <Card className="animate-fade-in-up">
          <CardHeader><CardTitle className="text-base">Perfil</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt style={{ color: "#6D7B77" }}>Ubicación</dt>
              <dd style={{ color: "#1F2937" }}>{finca.ubicacion ?? "—"}</dd>
              <dt style={{ color: "#6D7B77" }}>Tamaño aprox.</dt>
              <dd style={{ color: "#1F2937" }}>{finca.tamano_hato_aprox ?? "—"}</dd>
              <dt style={{ color: "#6D7B77" }}>Creada</dt>
              <dd style={{ color: "#1F2937" }}>{finca.creado_en ? new Date(finca.creado_en).toLocaleDateString("es-CO") : "—"}</dd>
            </dl>
            {esAdmin && (
              <div className="flex items-end gap-2 border-t pt-4" style={{ borderColor: "#DDE5DD" }}>
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="estado">Estado del piloto</Label>
                  <Select id="estado" value={nuevoEstado} onChange={(e) => setNuevoEstado(e.target.value)}>
                    {ESTADOS.map((e) => (
                      <option key={e.value} value={e.value}>{e.label}</option>
                    ))}
                  </Select>
                </div>
                <Button
                  size="sm"
                  disabled={guardando || nuevoEstado === finca.estado_piloto}
                  onClick={() => actualizarFinca({ estado_piloto: nuevoEstado })}
                >
                  Guardar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Potreros */}
        <Card className="animate-fade-in-up">
          <CardHeader><CardTitle className="text-base">Potreros</CardTitle></CardHeader>
          <CardContent>
            {potreros.length === 0 ? (
              <p className="text-sm" style={{ color: "#9AA7A3" }}>Sin potreros registrados todavía.</p>
            ) : (
              <ul className="space-y-2">
                {potreros.map((p) => (
                  <li key={p.potrero_id} className="flex items-center justify-between text-sm">
                    <span style={{ color: "#1F2937" }}>{p.nombre ?? p.potrero_id}</span>
                    <span style={{ color: "#9AA7A3" }}>
                      {p.area_hectareas ? `${p.area_hectareas} ha` : ""}
                      {p.capacidad_animales ? ` · cap. ${p.capacidad_animales}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Usuarios */}
      <Card className="animate-fade-in-up">
        <CardHeader><CardTitle className="text-base">Usuarios</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {usuarios.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Respuesta</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuarios.map((u) => (
                  <TableRow key={u.telefono}>
                    <TableCell>{u.nombre ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{u.telefono}</TableCell>
                    <TableCell><Badge variant={u.rol === "ADMIN" ? "indigo" : "gray"}>{u.rol}</Badge></TableCell>
                    <TableCell style={{ color: "#6D7B77" }}>{u.modo_respuesta === "VOZ" ? "🔊 Voz" : "Texto"}</TableCell>
                    <TableCell>
                      {u.activo ? <Badge variant="green">Activo</Badge> : <Badge variant="gray">Inactivo</Badge>}
                    </TableCell>
                    <TableCell>
                      {u.activo && esAdmin && (
                        <Button variant="destructive" size="sm" onClick={() => handleDesactivarUsuario(u.telefono)}>
                          Desactivar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {passwordMostrada && (
            <div className="rounded-xl p-4" style={{ backgroundColor: "#E7F3E3", border: "1px solid #CFE6CB" }}>
              <p className="text-sm" style={{ color: "#1E4A1E" }}>
                Contraseña temporal para {passwordMostrada.telefono} (no se vuelve a mostrar):
              </p>
              <code className="mt-2 block rounded-lg bg-white px-3 py-2 font-mono text-sm" style={{ color: "#0B4C4A" }}>
                {passwordMostrada.password}
              </code>
            </div>
          )}

          {esAdmin && (
            <form onSubmit={handleAgregarUsuario} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_120px_120px_auto] sm:items-end">
              <div className="space-y-1.5">
                <Label htmlFor="u_nombre">Nombre</Label>
                <Input
                  id="u_nombre"
                  value={nuevoUsuario.nombre}
                  onChange={(e) => setNuevoUsuario((u) => ({ ...u, nombre: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="u_telefono">WhatsApp</Label>
                <Input
                  id="u_telefono"
                  placeholder="+573001234567"
                  value={nuevoUsuario.telefono}
                  onChange={(e) => setNuevoUsuario((u) => ({ ...u, telefono: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="u_rol">Rol</Label>
                <Select
                  id="u_rol"
                  value={nuevoUsuario.rol}
                  onChange={(e) => setNuevoUsuario((u) => ({ ...u, rol: e.target.value }))}
                >
                  <option value="LECTURA">Lectura</option>
                  <option value="ADMIN">Admin</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="u_modo">Respuesta</Label>
                <Select
                  id="u_modo"
                  value={nuevoUsuario.modo_respuesta}
                  onChange={(e) => setNuevoUsuario((u) => ({ ...u, modo_respuesta: e.target.value }))}
                >
                  <option value="TEXTO">Texto</option>
                  <option value="VOZ">Voz</option>
                </Select>
              </div>
              <Button type="submit" size="sm" disabled={guardando}>Agregar</Button>
            </form>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Alertas activas */}
        <Card className="animate-fade-in-up">
          <CardHeader><CardTitle className="text-base">Alertas activas</CardTitle></CardHeader>
          <CardContent>
            {alertas.length === 0 ? (
              <p className="text-sm" style={{ color: "#9AA7A3" }}>Sin alertas activas.</p>
            ) : (
              <ul className="space-y-3">
                {alertas.map((a) => (
                  <li key={a.alerta_sk} className="text-sm">
                    <Badge variant="yellow">{a.tipo_alerta}</Badge>
                    <p className="mt-1" style={{ color: "#6D7B77" }}>{a.descripcion}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Notas de seguimiento */}
        <Card className="animate-fade-in-up">
          <CardHeader><CardTitle className="text-base">Notas de seguimiento</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {esAdmin && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!nuevaNota.trim()) return;
                  const ok = await actualizarFinca({ nota: nuevaNota.trim() });
                  if (ok) setNuevaNota("");
                }}
                className="flex gap-2"
              >
                <Input
                  value={nuevaNota}
                  onChange={(e) => setNuevaNota(e.target.value)}
                  placeholder="Ej: llamar el 15 para seguimiento"
                />
                <Button type="submit" size="sm" disabled={guardando || !nuevaNota.trim()}>Agregar</Button>
              </form>
            )}
            {(finca.notas ?? []).length === 0 ? (
              <p className="text-sm" style={{ color: "#9AA7A3" }}>Sin notas todavía.</p>
            ) : (
              <ul className="space-y-2">
                {[...(finca.notas ?? [])].reverse().map((n, i) => (
                  <li key={i} className="text-sm">
                    <span className="font-mono text-xs" style={{ color: "#9AA7A3" }}>
                      {new Date(n.fecha).toLocaleString("es-CO")}
                    </span>
                    <p style={{ color: "#1F2937" }}>{n.texto}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Costo de uso (OpenAI + WhatsApp, últimos 30 días) */}
      <Card className="animate-fade-in-up">
        <CardHeader><CardTitle className="text-base">Costo de uso — últimos 30 días</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl p-4" style={{ backgroundColor: "#F3F6F3" }}>
              <p className="text-2xl font-bold" style={{ color: "#0B4C4A" }}>{costos.total_whatsapp_recibidos}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide" style={{ color: "#9AA7A3" }}>Mensajes recibidos (ganadero)</p>
            </div>
            <div className="rounded-xl p-4" style={{ backgroundColor: "#F3F6F3" }}>
              <p className="text-2xl font-bold" style={{ color: "#0B4C4A" }}>{costos.total_whatsapp_mensajes}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide" style={{ color: "#9AA7A3" }}>Mensajes enviados (agente)</p>
            </div>
            <div className="rounded-xl p-4" style={{ backgroundColor: "#F3F6F3" }}>
              <p className="text-2xl font-bold" style={{ color: "#0B4C4A" }}>{costos.total_openai_llamadas}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide" style={{ color: "#9AA7A3" }}>Llamadas a OpenAI</p>
            </div>
          </div>
          {costos.dias.length === 0 ? (
            <p className="text-sm" style={{ color: "#9AA7A3" }}>Sin datos de uso en este período.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Recibidos</TableHead>
                  <TableHead>Enviados</TableHead>
                  <TableHead>Llamadas a OpenAI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...costos.dias].reverse().map((d) => (
                  <TableRow key={d.fecha}>
                    <TableCell>{new Date(d.fecha).toLocaleDateString("es-CO")}</TableCell>
                    <TableCell className="tabular-nums">{d.whatsapp_mensajes_recibidos ?? 0}</TableCell>
                    <TableCell className="tabular-nums">{d.whatsapp_mensajes_enviados ?? 0}</TableCell>
                    <TableCell className="tabular-nums">{d.openai_llamadas ?? 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Tendencia de actividad */}
      <Card className="animate-fade-in-up">
        <CardHeader><CardTitle className="text-base">Eventos registrados por día (30 días)</CardTitle></CardHeader>
        <CardContent>
          <TrendChart data={eventos_por_dia} />
        </CardContent>
      </Card>

      {/* Eventos recientes */}
      <Card className="animate-fade-in-up">
        <CardHeader><CardTitle className="text-base">Actividad reciente</CardTitle></CardHeader>
        <CardContent>
          {eventos_recientes.length === 0 ? (
            <p className="text-sm" style={{ color: "#9AA7A3" }}>Sin eventos registrados todavía.</p>
          ) : (
            <ul className="space-y-2">
              {eventos_recientes.map((e, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <span style={{ color: "#1F2937" }}>
                    <span className="font-semibold">{e.tipo_evento}</span>
                    {e.arete_id && <span style={{ color: "#6D7B77" }}> — arete {e.arete_id}</span>}
                  </span>
                  <span className="font-mono text-xs" style={{ color: "#9AA7A3" }}>
                    {e.fecha_creacion ? new Date(e.fecha_creacion).toLocaleString("es-CO") : "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Auditoría: quién hizo qué en esta finca desde el panel */}
      <Card className="animate-fade-in-up">
        <CardHeader><CardTitle className="text-base">Actividad del panel (auditoría)</CardTitle></CardHeader>
        <CardContent>
          {auditoria.length === 0 ? (
            <p className="text-sm" style={{ color: "#9AA7A3" }}>Sin acciones registradas todavía.</p>
          ) : (
            <ul className="space-y-2">
              {auditoria.map((a) => (
                <li key={a.timestamp} className="flex items-start justify-between gap-4 text-sm">
                  <span style={{ color: "#1F2937" }}>
                    <span className="font-semibold">{a.usuario}</span>
                    {" — "}
                    {ACCIONES_LABEL[a.accion] ?? a.accion}
                    {a.detalle && <span style={{ color: "#6D7B77" }}> ({a.detalle})</span>}
                  </span>
                  <span className="shrink-0 font-mono text-xs" style={{ color: "#9AA7A3" }}>
                    {new Date(a.timestamp.split("#")[0]).toLocaleString("es-CO")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
