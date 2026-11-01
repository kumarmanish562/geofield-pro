export function ErrorState({ onRetry }) {
  return (
    <div className="state-panel error-state">
      <strong>We could not load this page.</strong>
      <span>Check your connection and try again.</span>
      {onRetry && (
        <button className="button button-small" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
