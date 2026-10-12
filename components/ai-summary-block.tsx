"use client";

import { useEffect, useState } from "react";
import { Flag, Sparkles } from "lucide-react";

import type { AiSummaryContent, AiSummaryResponse } from "@/lib/ai-summary/types";
import { buildBasicSummary } from "@/lib/analysis/basic-summary";
import type { AnalysisResult } from "@/lib/analysis/types";
import { GlassCard } from "@/components/ui/glass-card";

type State =
  | { kind: "loading" }
  | { kind: "ok"; summary: AiSummaryContent }
  | { kind: "fallback" };

/** Префикс сообщения о неточности в /api/feedback — по нему такие сообщения видны в админке. */
export const AI_SUMMARY_REPORT_PREFIX = "Резюме ИИ: ";

/**
 * «Коротко о составе» — резюме от ИИ по данным базы Buty.
 * Грузится отдельно от разбора: карточки уже на экране, резюме появляется через пару секунд.
 * Если ИИ выключен, недоступен, распознано мало или ответ не прошёл проверку —
 * показываем сводку по правилам из данных базы (buildBasicSummary): блок есть всегда.
 */
export function AiSummaryBlock({
  text,
  result,
  onReport,
}: {
  text: string;
  result: AnalysisResult;
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
        else setState({ kind: "fallback" });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ kind: "fallback" });
      });
    return () => controller.abort();
  }, [text]);

  const summary: AiSummaryContent | null =
    state.kind === "ok" ? state.summary : state.kind === "fallback" ? buildBasicSummary(result) : null;
  const isAi = state.kind === "ok";

  return (
    <GlassCard className="space-y-4 p-6 sm:p-8" aria-live="polite">
      <h2 className="font-display flex items-center gap-2 text-xl font-bold">
        <Sparkles className="h-5 w-5 text-brand" /> Коротко о составе
      </h2>

      {!summary ? (
        <div className="space-y-3" aria-busy="true">
          <div className="h-5 w-3/4 animate-pulse rounded-full bg-muted" />
          <div className="h-4 w-full animate-pulse rounded-full bg-muted" />
          <div className="h-4 w-5/6 animate-pulse rounded-full bg-muted" />
          <p className="text-xs text-muted-foreground">Пишем резюме…</p>
        </div>
      ) : (
        <>
          <p className="font-display text-lg font-semibold leading-snug">{summary.verdict}</p>
          <dl className="space-y-3 text-sm">
            {summary.inside && (
              <div>
                <dt className="font-semibold">Что внутри</dt>
                <dd className="text-muted-foreground">{summary.inside}</dd>
              </div>
            )}
            {summary.suits && (
              <div>
                <dt className="font-semibold">Кому подойдёт</dt>
                <dd className="text-muted-foreground">{summary.suits}</dd>
              </div>
            )}
            {summary.caution && (
              <div>
                <dt className="font-semibold">На что обратить внимание</dt>
                <dd className="text-muted-foreground">{summary.caution}</dd>
              </div>
            )}
          </dl>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
            <span>Это не медицинская консультация.</span>
            {onReport && (
              <button
                type="button"
                className="inline-flex items-center gap-1 underline-offset-4 hover:text-foreground hover:underline"
                onClick={() =>
                  onReport(`${isAi ? AI_SUMMARY_REPORT_PREFIX : "Сводка: "}${summary.verdict}`.slice(0, 200))
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
