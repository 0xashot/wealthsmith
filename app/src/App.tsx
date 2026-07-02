/**
 * Step 1 scaffold placeholder: a token smoke test.
 *
 * This page only proves the token pipeline works. It renders token names
 * and their resolved values — no dashboard UI, no financial values, no
 * product copy. It will be replaced by the Dashboard in step 2.
 */

const colorSamples = [
  "--color-text-primary",
  "--color-text-secondary",
  "--color-surface-card",
  "--color-action-primary-background-default",
  "--color-border-subtle",
  "--color-feedback-info-background-solid",
  "--color-feedback-warning-background-solid",
  "--color-feedback-success-background-solid",
];

function resolvedValue(varName: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
}

export default function App() {
  return (
    <main
      style={{
        maxWidth: "720px",
        margin: "0 auto",
        padding: "var(--spacing-page-padding-desktop)",
      }}
    >
      <h1
        style={{
          font: "var(--typography-display-pageTitle-font)",
          letterSpacing: "var(--typography-display-pageTitle-letter-spacing)",
        }}
      >
        WealthSmith app scaffold
      </h1>
      <p style={{ color: "var(--color-text-secondary)" }}>
        Token pipeline smoke test. Semantic tokens are generated from{" "}
        <code>tokens/semantic/*.json</code> into CSS custom properties.
      </p>

      <section
        style={{
          background: "var(--color-surface-card)",
          border: "1px solid var(--color-border-subtle)",
          borderRadius: "var(--radius-surface-md)",
          boxShadow: "var(--shadow-card-default)",
          padding: "var(--spacing-card-padding-md)",
          display: "grid",
          gap: "var(--spacing-card-gap-sm)",
        }}
      >
        <h2 style={{ font: "var(--typography-heading-md-font)", margin: 0 }}>
          Color tokens
        </h2>
        {colorSamples.map((name) => (
          <div
            key={name}
            style={{ display: "flex", alignItems: "center", gap: "var(--spacing-inline-gap-md)" }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 20,
                height: 20,
                borderRadius: "var(--radius-control-sm)",
                border: "1px solid var(--color-border-subtle)",
                background: `var(${name})`,
                display: "inline-block",
              }}
            />
            <code style={{ font: "var(--typography-body-sm-font)" }}>
              {name} = {resolvedValue(name) || "(missing)"}
            </code>
          </div>
        ))}

        <h2 style={{ font: "var(--typography-heading-md-font)", margin: 0 }}>
          Typography tokens
        </h2>
        <p style={{ font: "var(--typography-body-md-font)", margin: 0 }}>
          typography.body.md — Manrope body text
        </p>
        <p style={{ font: "var(--typography-metric-primary-font)", margin: 0 }}>
          1234.56
        </p>
        <p style={{ font: "var(--typography-body-sm-font)", margin: 0, color: "var(--color-text-secondary)" }}>
          typography.metric.primary above should render in Space Grotesk.
        </p>
      </section>
    </main>
  );
}
