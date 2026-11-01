export function PageHeader({ title, description, action }) {
  return (
    <div className="content-header">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
