using System;
using System.Text.RegularExpressions;

namespace OpsDeck.Desktop
{
    public static class AiTriageAgent
    {
        public static TriageIncomingItem Analyze(string platform, string sender, string subject, string body)
        {
            string combined = (subject + " " + body).ToLowerInvariant();
            string externalCode = (platform == "ServiceNow" ? "INC-" : "TI-") + new Random().Next(100, 999);

            bool isNoise = Regex.IsMatch(combined, @"newsletter|publicidad|no-reply|notificación automática|resumen semanal|capacitación opcional|webinar");
            bool isCritical = Regex.IsMatch(combined, @"urgente|caída|caida|bloqueo|producción|produccion|sap|vpn|planta|error crítico|crítico|p1|datacenter|servidor caído");
            bool isHigh = Regex.IsMatch(combined, @"acceso|clave|permiso|correo|outlook|licencia|teams|impresora|fallo|requerimiento");

            if (isNoise)
            {
                return new TriageIncomingItem
                {
                    Id = Guid.NewGuid().ToString("N").Substring(0, 8),
                    ExternalId = externalCode,
                    SourcePlatform = platform,
                    Sender = sender,
                    Subject = subject,
                    Snippet = body.Length > 120 ? body.Substring(0, 117) + "..." : body,
                    IsActionable = false,
                    AiConfidence = 96,
                    AiReasoning = "Detectado como correo informativo o boletín masivo sin impacto operativo directo. Descartado.",
                    SlaMinutes = 0,
                    SuggestedPriority = TaskPriority.Low,
                    SuggestedStatus = TaskStatus.Blocked,
                    ProcessedIntoKanban = false
                };
            }

            TaskPriority priority = isCritical ? TaskPriority.Critical : (isHigh ? TaskPriority.High : TaskPriority.Medium);
            TaskStatus status = isCritical ? TaskStatus.Urgent : TaskStatus.InProgress;
            int sla = isCritical ? 15 : (isHigh ? 45 : 120);

            string reasoning = isCritical
                ? "Incidencia crítica detectada con SLA inmediato de " + sla + " min. Asignada automáticamente a columna URGENTES."
                : "Requerimiento operativo válido clasificado con prioridad " + priority + " y SLA de " + sla + " min.";

            return new TriageIncomingItem
            {
                Id = Guid.NewGuid().ToString("N").Substring(0, 8),
                ExternalId = externalCode,
                SourcePlatform = platform,
                Sender = sender,
                Subject = subject,
                Snippet = body.Length > 120 ? body.Substring(0, 117) + "..." : body,
                IsActionable = true,
                AiConfidence = 98,
                AiReasoning = reasoning,
                SlaMinutes = sla,
                SuggestedPriority = priority,
                SuggestedStatus = status,
                ProcessedIntoKanban = false
            };
        }
    }
}
