import { EmptyState } from "../components/ui/EmptyState.jsx";
import { PageHeader } from "../components/layout/PageHeader.jsx";

export function ModulePlaceholderPage({ title, description }) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <div className="panel">
        <EmptyState
          title={`${title} is ready for integration`}
          description="This foundation page is intentionally empty until its backend module is implemented."
        />
      </div>
    </>
  );
}
