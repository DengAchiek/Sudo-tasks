import { useCallback, useEffect, useState } from "react";
import type { ApiMeta } from "../types/analytics";

export function useRoadlensData<T>(load: () => Promise<{ data: T; meta: ApiMeta }>, dependencies: readonly unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [meta, setMeta] = useState<ApiMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    load()
      .then((result) => { if (active) { setData(result.data); setMeta(result.meta); } })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "The analytics service is unavailable."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies, attempt]);

  return { data, meta, error, loading, reload };
}
