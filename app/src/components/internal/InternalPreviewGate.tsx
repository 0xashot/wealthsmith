// Internal-only preview gate. Not for production user flows.
//
// Renders children ONLY when the dev-only preview route is explicitly enabled
// (local dev build + VITE_INTERNAL_SOL_LST_PREVIEW="true"). It calls no wallet
// code, no suggestion engine, no selector live flow, and never fetches or runs
// transactions.
import type { ReactNode } from "react";
import { isInternalSolLstPreviewRouteEnabled } from "./internalPreviewFlags";

interface InternalPreviewGateProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export default function InternalPreviewGate({ children, fallback = null }: InternalPreviewGateProps) {
  if (!isInternalSolLstPreviewRouteEnabled()) return <>{fallback}</>;
  return <>{children}</>;
}
