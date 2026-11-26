'use client';
import { useEffect, useState } from 'react';
// Reads ?a=b after mount (avoids Suspense requirements of useSearchParams during static build).
export function useQueryParams() {
  const [params, setParams] = useState(null);
  useEffect(() => { setParams(new URLSearchParams(window.location.search)); }, []);
  return params;
}
