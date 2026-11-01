export function Input({ label, error, ...props }) {
  return (
    <label className="input-field">
      <span>{label}</span>
      <input {...props} />
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}
