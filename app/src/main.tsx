// Buffer polyfill for @solana/web3.js / wallet-adapter (browser has no Buffer).
// Read-only wallet connection uses no Node crypto/network beyond adapter compat.
import { Buffer } from "buffer";
if (typeof globalThis.Buffer === "undefined") {
  globalThis.Buffer = Buffer;
}

// Minimal `process` shim: the Kamino SDK (and some Solana deps) reference the Node
// `process` global. Set before anything imports them. No Node runtime is used.
const g = globalThis as unknown as { process?: { env: Record<string, string> } };
if (typeof g.process === "undefined") {
  g.process = { env: {} };
}

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import SolanaWalletProvider from "./wallet/SolanaWalletProvider";
import { initAnalytics } from "./analytics/analytics";
import "./styles/base.css";

// Analytics: a no-op without VITE_POSTHOG_KEY, so the app runs identically without it.
void initAnalytics();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SolanaWalletProvider>
      <App />
    </SolanaWalletProvider>
  </React.StrictMode>
);
