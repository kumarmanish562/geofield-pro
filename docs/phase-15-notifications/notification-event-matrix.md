# Notification event matrix

| Type | Trigger | Recipient | Deep link / context | Deduplication |
| --- | --- | --- | --- | --- |
| `ASSIGNMENT_PUBLISHED` | Assignment enters published state, including resume | Active assigned employees | Assignment details | Assignment ID and publish timestamp, then recipient |
| `ASSIGNMENT_UPDATED` | Relevant assignment fields change (dates, name, work area, targets, requirements, description) | Active assigned employees | Assignment details; changed field names | Assignment ID and updated timestamp, then recipient |
| `ASSIGNMENT_DEADLINE_APPROACHING` | Poller sees published assignment at configured 1/3 day offsets | Active assigned employees | Assignment details; interval in metadata | Assignment ID, interval and recipient |
| `SURVEY_APPROVED` | Authorized review transaction approves | Original submitter | Survey details | Survey ID and review timestamp/status |
| `SURVEY_REJECTED` | Authorized review transaction rejects | Original submitter | Survey details; sanitized reviewer comment | Survey ID and review timestamp/status |
| `SURVEY_CORRECTION_REQUESTED` | Authorized review transaction requests correction | Original submitter | Survey correction screen | Survey ID and review timestamp/status |
| `SYNC_FAILED` | Offline survey version conflict needs employee intervention | Employee who synced | Sync status; operation reference and recovery steps | Persisted sync event ID |
| `ATTENDANCE_UPDATE` | Check-in/out, correction request, and correction decision | Direct supervisor for employee actions; employee for a correction decision | Attendance view; correction ID and decision | Attendance event or correction ID and action |

All listed operations create the notification and push-delivery row in the
same database transaction as the event they describe. Temporarily unavailable
network submissions do not generate `SYNC_FAILED` notifications; version
conflicts requiring a refresh do.
