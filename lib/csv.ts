// Export CSV en el navegador, sin librería -- son listados chicos (fincas,
// alertas de un puñado de pilotos), no vale la pena una dependencia nueva.
function celda(valor: unknown): string {
  const texto = valor === null || valor === undefined ? "" : String(valor);
  // Comillas dobles si el valor trae coma, comilla o salto de línea.
  return /[",\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export function descargarCSV(nombreArchivo: string, filas: Record<string, unknown>[]): void {
  if (filas.length === 0) return;
  const columnas = Object.keys(filas[0]);
  const lineas = [
    columnas.join(","),
    ...filas.map((fila) => columnas.map((c) => celda(fila[c])).join(",")),
  ];
  // BOM UTF-8 para que Excel no dañe las tildes/ñ al abrir el archivo.
  const blob = new Blob(["﻿" + lineas.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  a.click();
  URL.revokeObjectURL(url);
}
