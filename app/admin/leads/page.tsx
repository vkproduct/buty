import { prisma } from "@/lib/prisma";
import { GlassCard } from "@/components/ui/glass-card";

/** Заявки брендов со страницы /for-brands. */
export default async function AdminLeads() {
  const leads = await prisma.brandLead.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <GlassCard className="space-y-4 p-6">
      {leads.length === 0 && (
        <p className="text-muted-foreground">Заявок пока нет.</p>
      )}
      {leads.map((lead) => (
        <div
          key={lead.id}
          className="space-y-1 rounded-2xl bg-white/50 p-4 text-sm"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-lavender">{lead.brandName}</span>
            <span className="text-muted-foreground">
              {lead.contact} · {lead.email}
            </span>
            <span className="ml-auto text-xs text-muted-foreground">
              {lead.createdAt.toLocaleDateString("ru-RU")}
            </span>
          </div>
          <p className="text-muted-foreground">{lead.message}</p>
        </div>
      ))}
    </GlassCard>
  );
}
