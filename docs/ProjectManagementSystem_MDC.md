# Project Management System — Module Design & Capabilities (MDC)

Generated: 2025-11-10
Module: Project Management System (backend)

This document lists and explains the functionalities implemented to date in the backend for the Project Management System. It is based on the current codebase artifacts reviewed (notably: `Modal/SubTaskModal.js`, `Route/SubTaskRoute.js`, and `helper/projrectprogresshelper.js`) and on the routing/middleware conventions used across the project.

## Table of contents

- Overview
- Implemented features (detailed)
- Data models (documented)
- API endpoints implemented (routes, methods, middleware & role guards)
- Important helper/service behavior (project progress aggregation)
- Security and access control
- Error handling and validations (current state)
- Suggested unit/integration tests (what to add now)
- Limitations & known gaps
- Next steps / recommended small tickets


## Overview

This backend module supports a Project Management System. The code reviewed implements SubTask management (model + routes), role-protected endpoints, file uploads for attachments, comment/timeLog references on subtasks, and a helper utility to keep Project-level progress in sync with Tasks.

The implemented parts are focused on task/subtask lifecycle, assignment, attachments, and project progress aggregation.


## Implemented features (summary)

Below are the concrete features implemented and the source code elements that realize them.

1. Multiple assignees per subtask
   - Implemented in `Modal/SubTaskModal.js` as `assignees` array. Each assignee object contains `user`, `status`, and `completedAt`.
2. Subtask statuses (workflow)
   - `status` with enum values: `todo`, `in-progress`, `review`, `completed`.
3. Subtask priorities
   - `priority` enum: `Low`, `Medium`, `High`.
4. Start / Due dates on subtasks
   - `startDate` and `dueDate` fields are present.
5. Attachments for subtasks
   - `attachments` array with `filename`, `url`, `uploadedBy`, `uploadedAt` fields.
   - Upload middleware used in routes (`upload.array("attachments")`).
6. Time log references on subtasks
   - `timeLogs` referenced as ObjectId to `TimeLog` model.
7. Comments linking
   - `comments` array referencing `Comment` model.
8. Dependencies between subtasks
   - `dependencies` array referencing other `SubTask` documents.
9. Subtask progress field
   - `progress` numeric field 0–100.
10. Role-based access on routes
    - `requireRole('manager')` and `requireRole('employee')` used in SubTask routes.
11. Authentication middleware on routes
    - `requireAuth` is included on all SubTask routes shown.
12. SubTask CRUD & team endpoints
    - Endpoints for create, get by task, get by id, fetch team by task id, updates (manager/employee), status updates and delete.
13. File upload integration
    - `cloudinaryconfig` (upload middleware) is used in create route.
14. Project progress aggregation helper
    - `helper/projrectprogresshelper.js` scans tasks for a project and updates `Project.progress` and `Project.projectStatus` automatically after tasks change.
15. Controller-level separation
    - SubTask controller exists and exposes functions: CreateSubTask, getSubTasksByTaskId, getSubTaskBySubId, fetchTeamByTaskId, updateManagerSubTaskByID, updateEmployeeSubTaskByID, deleteSubTaskById, updateManagerSubTaskStatusById, updateEmployeeSubTaskStatusById

(These were detected from `Modal/SubTaskModal.js`, `Route/SubTaskRoute.js` and `helper/projrectprogresshelper.js`.)


## Data models (documented)

### SubTask (collection: `subtasks`)
Fields (as implemented in `Modal/SubTaskModal.js`):

- title: String (required)
- description: String
- task: ObjectId (ref: `Task`) — parent task/milestone (required)
- assignees: Array of objects {
  - user: ObjectId (ref: `User`)
  - status: String (enum: `todo`, `in-progress`, `review`, `completed`) — per-assignee status
  - completedAt: Date
}
- status: String (enum: `todo`, `in-progress`, `review`, `completed`) — subtask-wide status
- priority: String (enum: `Low`, `Medium`, `High`)
- startDate: Date | null
- dueDate: Date | null
- progress: Number (0–100, default 0)
- attachments: Array of objects {
  - filename: String
  - url: String
  - uploadedBy: ObjectId (ref: `User`)
  - uploadedAt: Date
}
- timeLogs: [ObjectId] (ref: `TimeLog`)
- comments: [ObjectId] (ref: `Comment`)
- createdBy: ObjectId (ref: `User`, required)
- dependencies: [ObjectId] (ref: `SubTask`)
- timestamps: createdAt, updatedAt (mongoose timestamps enabled)

Notes:
- The `assignees` design allows multiple users with independent statuses (helpful for collaboration).
- `dependencies` allow modeling of 'finish-to-start' style constraints between subtasks.


### Project (used by helper)

The helper expects a `Project` model that has at least the following fields:
- progress: Number
- projectStatus: String

(Full `Project` model was not included in reviewed files; recommended to include metadata fields in Project model: name, projectId, client info, start/end dates, budget, projectManager.)


### Task (referenced by helper)

The helper reads Task documents for a project and expects Task documents to have a `status` field using the same enum values (`todo`, `in-progress`, `review`, `completed`) so the progress calculation is consistent.


## API endpoints implemented (from `Route/SubTaskRoute.js`)

All SubTask endpoints require authentication (`requireAuth`). Some endpoints have role guards using `requireRole`.

1. POST /create-subTask/:id
   - Middleware: requireAuth, upload.array("attachments")
   - Controller: SubTaskController.CreateSubTask
   - Purpose: create a subtask under task id `:id`; supports file attachments
   - Access: authenticated users (route does not enforce a role in shown code)

2. GET /getSubTasks/:id
   - Middleware: requireAuth
   - Controller: SubTaskController.getSubTasksByTaskId
   - Purpose: get all subtasks for a Task id `:id`

3. GET /getSubTaskById/:id
   - Middleware: requireAuth
   - Controller: SubTaskController.getSubTaskBySubId
   - Purpose: get single subtask by id

4. GET /getTeamByTaskId/:id
   - Middleware: requireAuth
   - Controller: SubTaskController.fetchTeamByTaskId
   - Purpose: return aggregated team members assigned to the task (likely from subtask assignees)

5. PUT /updateManagerSubTaskById/:id
   - Middleware: requireAuth, requireRole('manager')
   - Controller: SubTaskController.updateManagerSubTaskByID
   - Purpose: manager-level update (fields managers can edit)

6. PUT /updateEmployeeSubTaskById/:id
   - Middleware: requireAuth, requireRole('employee')
   - Controller: SubTaskController.updateEmployeeSubTaskByID
   - Purpose: employee-level update (fields employees can edit)

7. DELETE /deleteSubTaskById/:id
   - Middleware: requireAuth
   - Controller: SubTaskController.deleteSubTaskById
   - Purpose: delete a subtask

8. PATCH /updateManagerSubTaskStatus
   - Middleware: requireAuth, requireRole('manager')
   - Controller: SubTaskController.updateManagerSubTaskStatusById
   - Purpose: manager-level status update(s) (body likely includes subtask id and new status)

9. PATCH /updateEmployeeSubTaskStatus
   - Middleware: requireAuth, requireRole('employee')
   - Controller: SubTaskController.updateEmployeeSubTaskStatusById
   - Purpose: employee-level status update(s)

Notes: route naming is consistent and uses both path params and body payloads. The routes rely on `upload` middleware for file storage (Cloudinary configured in `config/cloudinaryconfig.js`).


## Helper: Project progress aggregation (`helper/projrectprogresshelper.js`)

Purpose: Recalculate `Project.progress` and `projectStatus` based on `Task` statuses for a given project.

Behavior summary (as implemented):

- Query Tasks for a given `projectId`.
- If no tasks exist: set `{ progress: 0, projectStatus: 'draft' }`.
- Compute counts:
  - total
  - completedCount (task.status === 'completed')
  - reviewCount (task.status === 'review')
  - inProgressCount (task.status === 'in-progress')
- Compute `progress = Math.round((completedCount / total) * 100)`
- Determine `projectStatus`
  - if completedCount === total -> `Completed`
  - else if reviewCount > 0 -> `active`
  - else if inProgressCount > 0 or completedCount > 0 -> `active`
  - else -> `draft`
- Update Project via `Project.findByIdAndUpdate(projectId, { progress, projectStatus })`.

Important notes:
- The helper assumes Task statuses align with SubTask statuses and Task documents include `project` reference.
- Comments in code indicate `on Hold` and `archive` statuses should be set manually only and are excluded from auto-calculation.

Recommended usage:
- Call `updateProjectProgress(projectId)` after any Task or SubTask status change (controller logic or mongoose hooks) so Project progress remains accurate.


## Security & Access control

- Authentication middleware `requireAuth` is used on SubTask routes.
- Role-based authorization (`requireRole`) is enforced on manager/employee specific endpoints.
- File uploads are handled via `upload` middleware (Cloudinary). Ensure upload middleware sanitizes and validates file types and sizes.

Recommendations:
- Enforce more granular field update validation in controllers: `manager` vs `employee` should only be able to change allowed fields.
- Add server-side input validation (e.g., `express-validator` or `Joi`) on all endpoints.
- Ensure uploaded file URLs are restricted (signed URLs or proper access control in Cloudinary settings if needed).


## Error handling & validations (current state)

- Based on reviewed files, controllers exist but explicit validation/error-handling implementations were not shown.
- Ensure each controller returns consistent HTTP error codes and JSON error payloads.

Suggested pattern:
- 400 — validation error (provide field-level messages)
- 401 — unauthenticated
- 403 — unauthorized / role violation
- 404 — resource not found
- 500 — internal server error (include correlation id for logs)


## API contracts (examples)

Create SubTask (POST /create-subTask/:taskId)
Request (multipart/form-data):
- title (string) — required
- description (string) — optional
- startDate (ISO string) — optional
- dueDate (ISO string) — optional
- priority (Low|Medium|High) — optional
- assignees (JSON string or repeated keys) — see implementation for expected format
- attachments (files[])

Response (201):
{
  "success": true,
  "subTask": { /* SubTask document */ }
}

Get SubTasks (GET /getSubTasks/:taskId)
Response (200):
{
  "success": true,
  "data": [ /* array of SubTask documents */ ]
}

Update status (PATCH /updateEmployeeSubTaskStatus)
Request body (JSON):
{
  "subTaskId": "<id>",
  "newStatus": "in-progress"
}

Response (200):
{
  "success": true,
  "updated": { /* updated subtask */ }
}


## Sequence / flow notes

- Create-subtask flow:
  1. Authenticated user hits POST /create-subTask/:taskId with payload + attachments.
  2. `upload` middleware saves files (Cloudinary) and augments request with file info.
  3. Controller creates SubTask document with attachments metadata and saves.
  4. Optionally call `updateProjectProgress(projectId)` if task status or progress affects project.

- Status update flow (employee/manager):
  1. Controller verifies role and user ownership (if applicable).
  2. Update subtask.status and optionally per-assignee status & completedAt.
  3. Recompute parent Task progress (not provided in reviewed files) and call `updateProjectProgress(projectId)` to sync the Project.


## Suggested unit/integration tests (high value)

- Unit test for `updateProjectProgress`:
  - Case: zero tasks -> project progress 0 and status draft
  - Case: all tasks completed -> progress 100 and status Completed
  - Case: mixed status including review -> status active and correct percent

- SubTask creation controller tests:
  - Upload attachments (mock upload) and verify attachments metadata stored
  - Validate required fields (title, task reference)

- SubTask status updates (employee & manager):
  - Role enforcement: manager-only endpoints reject employee and vice versa
  - Per-assignee status update triggers `completedAt` set when moved to `completed`

- API integration tests for getSubTasks and fetchTeamByTaskId responses (correct members aggregated)


## Limitations & known gaps (from reviewed code)

- No full Project model documentation in reviewed files; some project metadata fields appear missing (client info, budget, project manager, project ID). These are required for the Project Setup and Project Details features.
- No timesheet/timeLog controller code was reviewed — time logging endpoints appear absent.
- No notification/alert system (email/push) — overdue alerts and escalations are not present.
- No reporting endpoints or aggregations for Gantt / Burndown charts were found.
- Validation and input sanitization were not visible in the reviewed controllers.


## Next steps & recommended small tickets (prioritized)

1. (High) Add missing Project metadata fields in `Modal/ProjectModal.js` (name, projectId, client info, start/end dates, budget, projectManager).
2. (High) Ensure `updateProjectProgress` is invoked after Task and SubTask status changes (controller-level or mongoose post-save hooks).
3. (Medium) Add a TimeLog model + APIs for timesheet creation and aggregation.
4. (Medium) Add server-side validation to all SubTask endpoints (express-validator/Joi) with clear error responses.
5. (Medium) Add file upload validation (mime, size) in `cloudinaryconfig` middleware usage.
6. (Medium) Create a small notification service and a daily cron job to send overdue alerts using `dueDate` and `status` fields.
7. (Low) Add reporting endpoints which return aggregated data for Gantt and burndown charts.


## Where to find the relevant files

- SubTask schema: `Modal/SubTaskModal.js`
- SubTask routes: `Route/SubTaskRoute.js`
- Project progress helper: `helper/projrectprogresshelper.js`
- Cloudinary/Uploads: `config/cloudinaryconfig.js`
- Middleware: `Middleware/requireAuth.js`, `Middleware/requiredrole.js`
- Controllers: `Controller/SubTaskController.js`, `Controller/TaskController.js` (Task controller existence inferred)


## Final remarks

This MDC documents the current backend capabilities for SubTask and Project progress features and recommends prioritized next work to expand coverage to full Project Setup, Time Management and Reporting functionality.

If you want, I can:
- open a PR that adds `Project` metadata fields and unit tests for `updateProjectProgress`;
- scan the entire `d:\ProjectManagement System\backend` tree and produce a file-backed mapping of implemented features vs. requested feature list.

Tell me which follow-up you'd like and I'll proceed.
