// Hook para sa Client Site Home page: kumukuha ng content galing backend,
// at gumagamit ng defaults habang naglo-load o kapag nag-error.
import { useEffect, useState } from "react";
import { getHomeContent } from "../admin/homeApi"; // ayusin ang path kung iba ang folder
import { DEFAULT_HOME_CONTENT, mergeHomeContent } from "./homeDefaults";

export function useHomeContent() {
  const [content, setContent] = useState(DEFAULT_HOME_CONTENT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getHomeContent()
      .then((data) => {
        if (!cancelled && data) setContent(mergeHomeContent(data));
      })
      .catch(() => { /* manatili sa defaults */ })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { content, loading };
}