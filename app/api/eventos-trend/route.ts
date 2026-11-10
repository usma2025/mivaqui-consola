import { NextResponse } from "next/server";
import { eventosPorDiaGlobal } from "@/lib/eventos-trend";

export async function GET() {
  const dias = await eventosPorDiaGlobal(30);
  return NextResponse.json({ dias });
}
