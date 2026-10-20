import type { NextConfig } from "next";

// cacheComponents (default del scaffold de create-next-app en Next 16.4) exige
// que CUALQUIER dato dinámico -- incluido usePathname() en el NavBar, o los
// params de una ruta dinámica como /fincas/[finca_id] -- esté envuelto en
// Suspense o falla el build entero. Para una herramienta interna de bajo
// tráfico, el prerenderizado parcial no aporta nada; se desactiva para que
// el comportamiento sea el mismo (probado y estable) que usan hato y
// Comercial/mivaqui.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
