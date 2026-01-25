# WAID Sync Specification

## Overview
Enable WAID to sync tasks between multiple instances via a central server.

## Architecture: Server-Mediated Sync
- Central server stores canonical task state
- Instances push local changes, pull remote changes
- Server handles conflict resolution (last-write-wins via updated_at)

## Data Model Changes

### New Task Columns
- `uuid` TEXT UNIQUE - Cross-instance identity (UUID v4)
- `deleted_at` TEXT - Soft delete timestamp (null = active)
- `synced_at` TEXT - Last successful sync timestamp

### Migration
- Generate UUIDs for existing tasks
- No data loss

## Sync API (REST)

### Push Changes
`POST /sync`
```json
{
  "device_id": "uuid",
  "changes": [
    { "uuid": "...", "name": "...", "details": "...", "updated_at": "...", ... }
  ]
}
```

### Pull Changes
`GET /sync?since=<timestamp>`
```json
{
  "changes": [...],
  "server_time": "2024-..."
}
```

## Conflict Resolution
- Last-write-wins based on `updated_at`
- Server is authoritative for conflicts

## Implementation Phases

### Phase 1: Sync-Ready Data Model
1. Add UUID to tasks
2. Add soft deletes (deleted_at)
3. Add sync tracking (synced_at)
4. Migration for existing data

### Phase 2: Sync Server
5. Design sync REST API
6. Build sync server (Node/Rust/Go + SQLite/Postgres)
7. Authentication (API key)

### Phase 3: Client Implementation
8. Add HTTP client (reqwest in Rust)
9. Sync Tauri commands (sync_push, sync_pull, sync_status)
10. Merge logic

### Phase 4: UI
11. Sync settings (server URL, API key, auto-sync)
12. Sync status indicator
13. Manual sync button
