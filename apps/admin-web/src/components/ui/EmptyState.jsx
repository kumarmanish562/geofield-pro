export function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="state-panel empty-state">
      {Icon && <Icon size={28} strokeWidth={1.5} />}
      <strong>{title}</strong>
      <span>{description}</span>
    </div>
  );
}
