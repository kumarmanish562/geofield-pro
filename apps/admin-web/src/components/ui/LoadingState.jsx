export function LoadingState({ label = "Loading..." }) {
  return (
    <div className="state-panel">
      <span className="spinner" aria-hidden="true" />
      {label}
    </div>
  );
}
