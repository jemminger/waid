# WAID Specs

## Overview
Basic task tracker with a vertical kanban view.

## Layout
- Full width
- Current/open tasks in the top bucket
- Completed tasks in time-based buckets below:
  - Today
  - Yesterday
  - One bucket each for 2–6 days ago
  - Last weeks 1–4
  - Last months 1..history
- Buckets are collapsible (start collapsed except Current/Today/Yesterday)
- Infinite scroll for history

## Tasks
### Attributes
- name (optional)
- details
- created_at (stored UTC, displayed in local timezone)
- updated_at (stored UTC, displayed in local timezone)
- closed_at (stored UTC, displayed in local timezone)

### Timezone Handling
- All timestamps are stored in the database as UTC ISO 8601 with Z suffix
- On display, timestamps are converted to the user's local timezone
- Bucket grouping (Today, Yesterday, etc.) uses local calendar days

### Cards
- ~5:4 aspect ratio, auto-flow into rows as needed (responsive grid)
- Show as much detail as possible within card size (name, truncated details, timestamps)
- Click card to open task modal

### Modal
- Create new task
- Edit existing task (name, details)
- Complete task (sets closed_at)
- Reopen task (clears closed_at)
- Delete task (with confirmation)

## Interactions
- Quick filter bar to search across task names and details
- Cmd+N opens new task modal
- Ctrl+Option+Cmd+N opens new task modal system-wide (brings window to front)
- Drag/drop reorder tasks in the open bucket
- Drag task into Today bucket to mark as complete (no reordering within Today)
- Completing a task animates it moving to the "today" bucket
- Empty buckets show "nothing here" with generous padding

## UI
- shadcn-svelte components
- Dark mode (system preference detection + manual toggle via icon button)
- Window position and size persisted between launches
- Color scheme: muted page background, subtle accent on bucket sections, clean card backgrounds (theme-aware via CSS vars)
