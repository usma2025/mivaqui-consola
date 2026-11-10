// Nombres de las tablas reales del producto (Ganado/Infra) y de Comercial —
// este panel las lee/escribe directamente, sin pasar por la API HTTP del
// producto (esa API siempre resuelve finca_id del caller autenticado; este
// panel necesita ver TODAS las fincas a la vez, que es justo lo que esa API
// no soporta por diseño). Mismo principio de "una cosa por responsabilidad"
// que el resto de MiVaqui: este panel no comparte código con el Backend,
// solo los nombres de las tablas que ya existen.
export const TABLES = {
  fincas: process.env.FINCAS_TABLE_NAME || "GanaderiaFincas-prod",
  animales: process.env.ANIMALES_TABLE_NAME || "GanaderiaAnimales-prod",
  eventos: process.env.EVENTOS_TABLE_NAME || "GanaderiaEventos-prod",
  alertas: process.env.ALERTAS_TABLE_NAME || "GanaderiaAlertas-prod",
  allowlist: process.env.ALLOWLIST_TABLE_NAME || "GanaderiaAllowlist-prod",
  potreros: process.env.POTREROS_TABLE_NAME || "GanaderiaPotreros-prod",
  intentosAcceso: process.env.INTENTOS_ACCESO_TABLE_NAME || "GanaderiaIntentosAcceso-prod",
  costos: process.env.COSTOS_TABLE_NAME || "AgentCostos-prod",
  pilotosComercial: process.env.PILOTOS_TABLE_NAME || "mivaqui-comercial-pilotos",
  // Tabla propia de este panel (no existe en el producto) — usuarios con
  // acceso al panel administrativo.
  adminUsuarios: process.env.ADMIN_USUARIOS_TABLE_NAME || "mivaqui-admin-usuarios",
  auditoria: process.env.ADMIN_AUDIT_TABLE_NAME || "mivaqui-admin-audit",
} as const;

export const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || "";
