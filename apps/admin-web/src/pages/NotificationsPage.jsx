import { useEffect, useState } from "react";
import {
  Bell,
  Check,
  Trash2,
  Settings2,
  ClipboardList,
  MapPinned,
  CalendarCheck,
  RefreshCw,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { PageHeader } from "../components/layout/PageHeader.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { LoadingState } from "../components/ui/LoadingState.jsx";
import { ErrorState } from "../components/ui/ErrorState.jsx";
import apiClient from "../services/apiClient.js";
import { NotificationCategory } from "@geofield/shared-constants";

const icons = {
  [NotificationCategory.ASSIGNMENT]: ClipboardList,
  [NotificationCategory.SURVEY]: MapPinned,
  [NotificationCategory.ATTENDANCE]: CalendarCheck,
  [NotificationCategory.SYNC]: RefreshCw,
  [NotificationCategory.SYSTEM]: Bell,
};
export function NotificationsPage() {
  const [tab, setTab] = useState("all");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const navigate = useNavigate();
  async function load() {
    setLoading(true);
    setError(false);
    try {
      const params = {
        page,
        pageSize: 20,
        ...(tab === "unread" ? { unreadOnly: true } : {}),
        ...(tab === "read" ? { readOnly: true } : {}),
        ...(category ? { category } : {}),
      };
      const response = await apiClient.get("/notifications", { params });
      setData(response.data.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, [tab, category, page]);
  async function mark(item, read) {
    try {
      await apiClient.patch(
        `/notifications/${item.id}/${read ? "read" : "unread"}`,
      );
      await load();
    } catch {
      toast.error("Notification state could not be changed.");
    }
  }
  async function remove(item) {
    if (!window.confirm("Delete this notification?")) return;
    try {
      await apiClient.delete(`/notifications/${item.id}`);
      toast.success("Notification deleted.");
      await load();
    } catch {
      toast.error("Notification could not be deleted.");
    }
  }
  async function markAll() {
    try {
      await apiClient.post("/notifications/read-all");
      toast.success("All notifications marked as read.");
      await load();
    } catch {
      toast.error("Notifications could not be updated.");
    }
  }
  function open(item) {
    if (!item.readAt) void mark(item, true);
    if (item.actionUrl?.startsWith("/")) navigate(item.actionUrl);
  }
  return (
    <>
      <PageHeader
        title="Notifications"
        description="Assignment, survey, attendance, and synchronization updates."
        action={
          <Link
            className="button button-small notification-settings-link"
            to="/settings/notifications"
          >
            <Settings2 size={15} /> Preferences
          </Link>
        }
      />
      <section className="panel notifications-toolbar">
        <div
          className="notification-tabs"
          role="tablist"
          aria-label="Notification status"
        >
          {[
            ["all", "All"],
            ["unread", "Unread"],
            ["read", "Read"],
          ].map(([value, label]) => (
            <button
              key={value}
              role="tab"
              aria-selected={tab === value}
              className={tab === value ? "selected" : ""}
              onClick={() => {
                setTab(value);
                setPage(1);
              }}
            >
              {label}
              {value === "unread" && data ? (
                <span>{data.unreadCount}</span>
              ) : null}
            </button>
          ))}
        </div>
        <label className="notification-filter-label">
          Category
          <select
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All categories</option>
            {["ASSIGNMENT", "SURVEY", "ATTENDANCE", "SYNC", "SYSTEM"].map(
              (value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ),
            )}
          </select>
        </label>
        <button
          className="button button-small"
          disabled={!data?.unreadCount}
          onClick={markAll}
        >
          <Check size={15} /> Mark all read
        </button>
      </section>
      {loading ? (
        <section className="panel">
          <LoadingState label="Loading notifications…" />
        </section>
      ) : error ? (
        <section className="panel">
          <ErrorState onRetry={load} />
        </section>
      ) : (
        <section className="panel notification-list-panel">
          <div className="notification-list-summary">
            <strong>{data?.pagination.total ?? 0} notifications</strong>
            <span>{data?.unreadCount ?? 0} unread</span>
          </div>
          {data?.notifications.length ? (
            data.notifications.map((item) => {
              const Icon = icons[item.category] ?? Bell;
              return (
                <article
                  className={`notification-row ${item.readAt ? "" : "is-unread"}`}
                  key={item.id}
                >
                  <button
                    className="notification-row-content"
                    onClick={() => open(item)}
                  >
                    <span className="notification-row-icon">
                      <Icon size={18} />
                    </span>
                    <span className="notification-row-text">
                      <span className="notification-row-title">
                        <strong>{item.title}</strong>
                        <em>{item.category}</em>
                      </span>
                      <small>{item.body}</small>
                      <time>{new Date(item.createdAt).toLocaleString()}</time>
                    </span>
                  </button>
                  <div className="notification-row-actions">
                    {item.actionUrl && (
                      <button
                        title="Open related item"
                        aria-label="Open related item"
                        onClick={() => open(item)}
                      >
                        Open
                      </button>
                    )}
                    <button
                      title={item.readAt ? "Mark unread" : "Mark read"}
                      aria-label={item.readAt ? "Mark unread" : "Mark read"}
                      onClick={() => mark(item, !item.readAt)}
                    >
                      <Check size={15} />
                    </button>
                    <button
                      title="Delete notification"
                      aria-label="Delete notification"
                      onClick={() => remove(item)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </article>
              );
            })
          ) : (
            <EmptyState
              icon={Bell}
              title="No notifications here"
              description="New operational updates will appear in this list."
            />
          )}
          <div className="pagination">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </button>
            <span>
              Page {page} · {data?.pagination.total ?? 0} total
            </span>
            <button
              disabled={page >= (data?.pagination.totalPages ?? 1)}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </section>
      )}
    </>
  );
}
