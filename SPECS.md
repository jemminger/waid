# WAID Specs

## Overview
Basic task tracker with a vertical kanban view.

## Layout
- Current/open tasks in the top bucket
- Completed tasks in time-based buckets below:
  - Today
  - Yesterday
  - One bucket each for 2–6 days ago
  - Last weeks 1–4
  - Last months 1..history
- Buckets are collapsible
- Infinite scroll for history

## Tasks
### Attributes
- name (optional)
- details
- created_at
- updated_at
- closed_at

### Cards
- Show as much detail as possible within card size (name, truncated details, timestamps)
- Click card to open task modal

### Modal
- Create new task
- Edit existing task (name, details)
- Complete task (sets closed_at)
- Reopen task (clears closed_at)
- Delete task

## Interactions
- Drag/drop reorder tasks in the open bucket
- Completing a task animates it moving to the "today" bucket
- Empty buckets show "nothing here" with generous padding

## UI
- shadcn-svelte components
- Dark mode (system preference detection + manual toggle)
