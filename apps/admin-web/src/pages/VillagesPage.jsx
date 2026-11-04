import { useEffect, useState } from "react";
import { Check, FileJson2, Upload, MapPinned, X } from "lucide-react";
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
  const [preview, setPreview] = useState(null);
  const [importError, setImportError] = useState("");
  const [importSummary, setImportSummary] = useState(null);
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
  async function previewFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    if (
      !file.name.toLowerCase().endsWith(".json") &&
      !file.name.toLowerCase().endsWith(".geojson")
    )
      return toast.error("Choose a GeoJSON file.");
    try {
      const geojson = JSON.parse(await file.text());
      if (geojson?.type !== "FeatureCollection" || !Array.isArray(geojson.features))
        throw new Error("The file must contain a GeoJSON FeatureCollection.");
      const geometryCounts = geojson.features.reduce((counts, feature) => {
        const type = feature?.geometry?.type ?? "Missing geometry";
        counts[type] = (counts[type] ?? 0) + 1;
        return counts;
      }, {});
      setImportError("");
      setPreview({ filename: file.name, geojson, geometryCounts });
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }
  async function importFile() {
    if (!preview) return;
    setImporting(true);
    setImportError("");
    try {
      const { data } = await apiClient.post("/villages/imports/geojson", {
        filename: preview.filename,
        geojson: preview.geojson,
      });
      const acceptedFeatures = data.data.acceptedFeatures ?? 0;
      setImportSummary({ filename: preview.filename, acceptedFeatures });
      toast.success(`${acceptedFeatures} villages imported.`);
      setPreview(null);
      await load();
    } catch (error) {
      setImportError(getApiErrorMessage(error));
    } finally {
      setImporting(false);
    }
  }
  return (
    <>
      <PageHeader
        title="Villages"
        description="Review village records and import GeoJSON boundaries."
        action={
          <label className="button button-primary">
            <Upload size={16} /> Import boundaries
            <input
              type="file"
              accept=".json,.geojson,application/geo+json"
              hidden
              onChange={previewFile}
              disabled={importing}
            />
          </label>
        }
      />
      {importSummary ? (
        <div className="village-import-success" role="status">
          <Check size={16} />
          <span><strong>{importSummary.acceptedFeatures} villages imported</strong><small>{importSummary.filename}</small></span>
          <button type="button" aria-label="Dismiss import result" onClick={() => setImportSummary(null)}><X size={16} /></button>
        </div>
      ) : null}
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
      {preview ? (
        <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !importing && setPreview(null)}>
          <section className="dialog village-import-dialog" role="dialog" aria-modal="true" aria-labelledby="village-import-title">
            <div className="dialog-header">
              <div><h3 id="village-import-title">Review boundary import</h3><p>Check the file summary before sending it for server validation.</p></div>
              <button type="button" onClick={() => !importing && setPreview(null)} aria-label="Close import preview" disabled={importing}><X size={18} /></button>
            </div>
            <div className="village-import-file"><FileJson2 size={20} /><span><strong>{preview.filename}</strong><small>GeoJSON FeatureCollection · {preview.geojson.features.length} features</small></span></div>
            <div className="village-import-breakdown">
              {Object.entries(preview.geometryCounts).map(([type, count]) => <div key={type}><span>{type}</span><strong>{count}</strong></div>)}
            </div>
            <p className="village-import-note">The server checks geometry validity and organization access during import. This preview only summarizes the selected file.</p>
            {importError ? <div className="village-import-error" role="alert">{importError}</div> : null}
            <div className="dialog-actions">
              <button className="button button-secondary" type="button" onClick={() => setPreview(null)} disabled={importing}>Cancel</button>
              <button className="button button-primary" type="button" onClick={importFile} disabled={importing || preview.geojson.features.length === 0}><Upload size={15} /> {importing ? "Importing…" : "Import and validate"}</button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
