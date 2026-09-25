import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/ui/glass-card";

/** Пользователи и их подписки (последние 100). */
export default async function AdminUsers() {
  const users = await prisma.user.findMany({
    include: { subscription: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <GlassCard className="overflow-x-auto p-6">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="pb-3 pr-4">Email</th>
            <th className="pb-3 pr-4">Регистрация</th>
            <th className="pb-3 pr-4">Тариф</th>
            <th className="pb-3">Статус</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t border-white/40">
              <td className="py-2 pr-4">{u.email}</td>
              <td className="py-2 pr-4 text-muted-foreground">
                {u.createdAt.toLocaleDateString("ru-RU")}
              </td>
              <td className="py-2 pr-4">
                <Badge
                  variant={
                    u.subscription?.plan === "pro" ? "lavender" : "outline"
                  }
                >
                  {u.subscription?.plan ?? "free"}
                </Badge>
              </td>
              <td className="py-2 text-muted-foreground">
                {u.subscription?.status ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </GlassCard>
  );
}
