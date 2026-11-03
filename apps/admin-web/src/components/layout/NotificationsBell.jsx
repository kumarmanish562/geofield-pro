import { useEffect, useState } from "react";
import { Bell, Check, ExternalLink } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import apiClient from "../../services/apiClient.js";

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  async function refresh() {
    try {
      const { data } = await apiClient.get("/notifications", {
        params: { page: 1, pageSize: 6 },
      });
      setItems(data.data.notifications);
      setUnreadCount(data.data.unreadCount);
    } catch {
      toast.error("Notifications could not be loaded.");
    }
  }
  useEffect(() => {
    refresh();
  }, []);
  async function openNotification(item) {
    try {
      if (!item.readAt) await apiClient.patch(`/notifications/${item.id}/read`);
      setUnreadCount((count) => Math.max(0, count - (item.readAt ? 0 : 1)));
      setItems((current) =>
        current.map((row) =>
          row.id === item.id
            ? { ...row, readAt: row.readAt ?? new Date().toISOString() }
            : row,
        ),
      );
      setOpen(false);
      if (item.actionUrl?.startsWith("/")) navigate(item.actionUrl);
    } catch {
      toast.error("Notification could not be opened.");
    }
  }
  return (
    <div className="notification-bell-wrap">
      <button
        className="icon-button notification-bell"
        aria-label={`Notifications, ${unreadCount} unread`}
        aria-expanded={open}
        onClick={() => {
          setOpen((value) => !value);
          if (!open) refresh();
        }}
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div
          className="notification-popover"
          role="dialog"
          aria-label="Recent notifications"
        >
          <div className="notification-popover-header">
            <strong>Notifications</strong>
            <span>{unreadCount} unread</span>
          </div>
          {items.length ? (
            items.map((item) => (
              <button
                className={`notification-popover-item ${item.readAt ? "" : "is-unread"}`}
                key={item.id}
                onClick={() => openNotification(item)}
              >
                <span className="notification-category-tag">
                  {item.category}
                </span>
                <strong>{item.title}</strong>
                <small>{item.body}</small>
                <time>{new Date(item.createdAt).toLocaleString()}</time>
              </button>
            ))
          ) : (
            <p className="analytics-empty">You’re all caught up.</p>
          )}
          <Link
            className="notification-popover-footer"
            to="/notifications"
            onClick={() => setOpen(false)}
          >
            View all notifications <ExternalLink size={14} />
          </Link>
          <button
            className="notification-popover-mark"
            onClick={async () => {
              try {
                await apiClient.post("/notifications/read-all");
                setUnreadCount(0);
                await refresh();
              } catch {
                toast.error("Notifications could not be updated.");
              }
            }}
          >
            <Check size={14} /> Mark all read
          </button>
        </div>
      )}
    </div>
  );
}
