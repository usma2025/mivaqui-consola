interface PuntoTrend {
  fecha: string;
  cantidad: number;
}

// Barras en SVG simple, sin librería de gráficas -- es una sola serie, un
// puñado de puntos (30 días), y esto es una herramienta interna de bajo
// tráfico; no vale la pena una dependencia nueva para esto.
export function TrendChart({ data, height = 120 }: { data: PuntoTrend[]; height?: number }) {
  if (data.length === 0) {
    return <p className="text-sm" style={{ color: "#9AA7A3" }}>Sin datos todavía.</p>;
  }

  const max = Math.max(1, ...data.map((d) => d.cantidad));
  const width = Math.max(data.length * 10, 300);
  const barWidth = width / data.length;

  return (
    <div className="w-full overflow-x-auto">
      <svg width={width} height={height + 20} role="img" aria-label="Tendencia de eventos por día">
        {data.map((d, i) => {
          const barHeight = (d.cantidad / max) * height;
          return (
            <g key={d.fecha}>
              <title>{`${d.fecha}: ${d.cantidad}`}</title>
              <rect
                x={i * barWidth + 1}
                y={height - barHeight}
                width={Math.max(barWidth - 2, 1)}
                height={barHeight}
                rx={2}
                fill={d.cantidad > 0 ? "#53B04B" : "#E7ECE7"}
              />
            </g>
          );
        })}
        <text x={0} y={height + 16} fontSize={10} fill="#9AA7A3">
          {data[0].fecha}
        </text>
        <text x={width} y={height + 16} fontSize={10} fill="#9AA7A3" textAnchor="end">
          {data[data.length - 1].fecha}
        </text>
      </svg>
    </div>
  );
}
