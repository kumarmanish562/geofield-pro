export function Button({
  children,
  loading = false,
  fullWidth = false,
  ...props
}) {
  return (
    <button
      className={`button ${fullWidth ? "button-full" : ""}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? "Working..." : children}
    </button>
  );
}
