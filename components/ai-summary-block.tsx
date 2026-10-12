"use client";

import { useEffect, useState } from "react";
import { Flag, Sparkles } from "lucide-react";

import type { AiSummaryContent, AiSummaryResponse } from "@/lib/ai-summary/types";
import { GlassCard } from "@/components/ui/glass-card";

type State =
  | { kind: "loading" }
  | { kind: "ok"; summary: AiSummaryContent }
  | { kind: "low-coverage" }
  | { kind: "hidden" };

/** Префикс сообщения о неточности в /api/feedback — по нему такие сообщения видны в админке. */
export const AI_SUMMARY_REPORT_PREFIX = "Резюме ИИ: ";

/**
 * «Коротко о составе» — резюме от ИИ по данным базы Buty.
 * Грузится отдельно от разбора: карточки уже на экране, резюме появляется через пару секунд.
 * Если ИИ выключен, недоступен или ответ не прошёл проверку, блок просто не показывается.
 */
export function AiSummaryBlock({
  text,
  onReport,
}: {
  text: string;
  onReport?: (token: string) => void;
}) {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    setState({ kind: "loading" });
    fetch("/api/analyze/summary", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    })
      .then((res) => (res.ok ? (res.json() as Promise<AiSummaryResponse>) : null))
      .then((data) => {
        if (controller.signal.aborted) return;
        if (data?.status === "ok") setState({ kind: "ok", summary: data.summary });
        else if (data?.status === "skipped" && data.reason === "low-coverage") {
          setState({ kind: "low-coverage" });
        } else setState({ kind: "hidden" });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ kind: "hidden" });
      });
    return () => controller.abort();
  }, [text]);

  if (state.kind === "hidden") return null;

  if (state.kind === "low-coverage") {
    return (
      <p className="text-center text-sm text-muted-foreground">
        Краткое резюме не составили: мы распознали меньше половины состава, и оно было бы неточным.
      </p>
    );
  }

  return (
    <GlassCard className="space-y-4 p-6 sm:p-8" aria-live="polite">
      <h2 className="font-display flex items-center gap-2 text-xl font-bold">
        <Sparkles className="h-5 w-5 text-brand" /> Коротко о составе
      </h2>

      {state.kind === "loading" ? (
        <div className="space-y-3" aria-busy="true">
          <div className="h-5 w-3/4 animate-pulse rounded-full bg-muted" />
          <div className="h-4 w-full animate-pulse rounded-full bg-muted" />
          <div className="h-4 w-5/6 animate-pulse rounded-full bg-muted" />
          <p className="text-xs text-muted-foreground">Пишем резюме…</p>
        </div>
      ) : (
        <>
          <p className="font-display text-lg font-semibold leading-snug">{state.summary.verdict}</p>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="font-semibold">Что внутри</dt>
              <dd className="text-muted-foreground">{state.summary.inside}</dd>
            </div>
            <div>
              <dt className="font-semibold">Кому подойдёт</dt>
              <dd className="text-muted-foreground">{state.summary.suits}</dd>
            </div>
            {state.summary.caution && (
              <div>
                <dt className="font-semibold">На что обратить внимание</dt>
                <dd className="text-muted-foreground">{state.summary.caution}</dd>
              </div>
            )}
          </dl>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
            <span>Резюме составил ИИ по данным базы Buty. Это не медицинская консультация.</span>
            {onReport && (
              <button
                type="button"
                className="inline-flex items-center gap-1 underline-offset-4 hover:text-foreground hover:underline"
                onClick={() =>
                  onReport(`${AI_SUMMARY_REPORT_PREFIX}${state.summary.verdict}`.slice(0, 200))
                }
              >
                <Flag className="h-3 w-3" /> Нашли неточность?
              </button>
            )}
          </div>
        </>
      )}
    </GlassCard>
  );
}
