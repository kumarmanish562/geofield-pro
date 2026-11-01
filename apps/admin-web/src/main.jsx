import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./styles.css";

function App() {
  return (
    <main className="shell">
      <p className="eyebrow">GeoField Pro</p>
      <h1>Field operations, clearly managed.</h1>
      <p className="intro">
        The administrative workspace is ready for organization, assignment,
        attendance, GIS, and survey workflows.
      </p>
      <section className="status-card" aria-label="Application status">
        <span className="status-dot" />
        <div>
          <strong>Admin web shell online</strong>
          <p>Connect an API session to continue.</p>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
