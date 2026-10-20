import { NextResponse } from "next/server";
import { DescribeAlarmsCommand } from "@aws-sdk/client-cloudwatch";
import { cloudwatch } from "@/lib/aws-clients";

// Las alarmas de monitoreo operativo creadas en Ganado/Infra (ver
// envs/prod/main.tf: aws_cloudwatch_metric_alarm.lambda_errors / api_5xx)
// todas llevan el prefijo "mivaqui-" -- las leemos acá para no depender
// solo del correo del tópico SNS separado.
export async function GET() {
  const resp = await cloudwatch.send(
    new DescribeAlarmsCommand({ AlarmNamePrefix: "mivaqui-", MaxRecords: 100 })
  );

  const alarmas = (resp.MetricAlarms ?? []).map((a) => ({
    nombre: a.AlarmName,
    descripcion: a.AlarmDescription,
    estado: a.StateValue,
    actualizado_en: a.StateUpdatedTimestamp,
  }));

  alarmas.sort((a, b) => (a.nombre ?? "").localeCompare(b.nombre ?? ""));
  const enAlarma = alarmas.filter((a) => a.estado === "ALARM");

  return NextResponse.json({ alarmas, en_alarma: enAlarma.length });
}
