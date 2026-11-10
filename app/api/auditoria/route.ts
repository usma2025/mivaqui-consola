import { NextResponse } from "next/server";
import { listarAuditoriaGlobal } from "@/lib/audit";

export async function GET() {
  const auditoria = await listarAuditoriaGlobal(100);
  return NextResponse.json({ auditoria });
}
