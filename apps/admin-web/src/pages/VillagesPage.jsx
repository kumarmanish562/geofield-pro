import { useEffect, useState } from "react";
import { Upload, MapPinned } from "lucide-react";
import { toast } from "react-hot-toast";
import apiClient, { getApiErrorMessage } from "../services/apiClient.js";
import { PageHeader } from "../components/layout/PageHeader.jsx";
import { Button } from "../components/ui/Button.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { LoadingState } from "../components/ui/LoadingState.jsx";

export function VillagesPage() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  async function load() {
    setLoading(true);
    try {
      const { data } = await apiClient.get("/villages", {
        params: { search: search || undefined, pageSize: 50 },
      });
      setItems(data.data.items);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, [search]);
  async function importFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (
      !file.name.toLowerCase().endsWith(".json") &&
      !file.name.toLowerCase().endsWith(".geojson")
    )
      return toast.error("Choose a GeoJSON file.");
    setImporting(true);
    try {
      const geojson = JSON.parse(await file.text());
      const { data } = await apiClient.post("/villages/imports/geojson", {
        filename: file.name,
        geojson,
      });
      toast.success(`${data.data.acceptedFeatures ?? 0} villages imported.`);
      await load();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  }
  return (
    <>
      <PageHeader
        title="Villages"
        description="Manage organization villages and PostGIS boundaries."
        action={
          <label className="button button-primary">
            <Upload size={16} /> {importing ? "Importing..." : "Import GeoJSON"}
            <input
              type="file"
              accept=".json,.geojson,application/geo+json"
              hidden
              onChange={importFile}
              disabled={importing}
            />
          </label>
        }
      />
      <div className="toolbar panel">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search village name or code"
          aria-label="Search villages"
        />
      </div>
      {loading ? (
        <LoadingState label="Loading villages..." />
      ) : items.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon={MapPinned}
            title="No villages found"
            description="Import a validated GeoJSON boundary file to begin."
          />
        </div>
      ) : (
        <div className="panel table-panel">
          <div className="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>Village</th>
                  <th>Code</th>
                  <th>District</th>
                  <th>Taluka</th>
                  <th>Status</th>
                  <th>Boundary</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name}</strong>
                    </td>
                    <td>{item.code}</td>
                    <td>{item.district || "—"}</td>
                    <td>{item.taluka || "—"}</td>
                    <td>
                      <span
                        className={`status-badge status-${item.status.toLowerCase()}`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td>
                      <Button
                        variant="secondary"
                        onClick={async () => {
                          try {
                            const { data } = await apiClient.get(
                              `/villages/${item.id}`,
                            );
                            if (!data.data.boundary)
                              toast("No boundary available.");
                            else
                              toast.success(
                                `Boundary: ${data.data.geometryType}`,
                              );
                          } catch (error) {
                            toast.error(getApiErrorMessage(error));
                          }
                        }}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
