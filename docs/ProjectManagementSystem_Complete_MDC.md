# Project Management System - Complete Module Design & Capabilities (MDC)

**Document Version**: 2.0  
**Last Updated**: November 18, 2025  
**Project**: Project Management System Backend  
**Repository**: Project-Management-System-Backend  
**Current Branch**: mybranch  

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Project Architecture](#project-architecture)
3. [Technology Stack](#technology-stack)
4. [Data Models & Schema](#data-models--schema)
5. [Module Overview](#module-overview)
6. [API Endpoints](#api-endpoints)
7. [Workflow Flows](#workflow-flows)
8. [Real-Time Features](#real-time-features)
9. [Security & Authentication](#security--authentication)
10. [Error Handling & Validation](#error-handling--validation)
11. [Current Implementation Status](#current-implementation-status)
12. [Known Issues & Limitations](#known-issues--limitations)
13. [Recommended Improvements](#recommended-improvements)
14. [Quick Start & Testing Guide](#quick-start--testing-guide)

---

## Executive Summary

The **Project Management System** is a comprehensive Node.js/Express backend that provides:

- **Role-based project management** (Managers create projects, Employees execute tasks)
- **Hierarchical task management** (Projects → Tasks/Milestones → SubTasks)
- **Real-time notifications** (Socket.IO with JWT authentication + Nodemailer email fallback)
- **Automatic progress tracking** (Project/Task/SubTask progress calculated from completion)
- **File management** (Cloudinary integration for secure file uploads)
- **Team collaboration** (Comments, time logging, team member assignment)

**Key Features**:
- ✅ Multi-user authentication (Manager & Employee roles)
- ✅ Project creation & team management
- ✅ Task/SubTask hierarchy with status tracking
- ✅ Real-time notifications (Socket.IO + Email)
- ✅ File uploads (Cloudinary)
- ✅ Progress calculation (auto-updated)
- ✅ Comments & collaboration
- ✅ Time tracking references

---

## Project Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React/Vue)                      │
│         Connected via JWT + WebSocket (Socket.IO)            │
└────────────────────────┬────────────────────────────────────┘
                         │
                    HTTP Requests
                   + WebSocket Events
                         │
        ┌────────────────▼────────────────┐
        │   Express Server (index.js)     │
        │  ┌──────────────────────────┐   │
        │  │ HTTP Server (from Express)│   │
        │  │ Socket.IO Initialized    │   │
        │  └──────────────────────────┘   │
        └────────┬──────────────────┬─────┘
                 │                  │
        ┌────────▼────────┐   ┌─────▼───────────┐
        │   Route Layer   │   │  Socket.IO      │
        │ (9 route files) │   │  (JWT Auth)     │
        └────────┬────────┘   └─────────────────┘
                 │
        ┌────────▼────────────────┐
        │  Controller Layer       │
        │ (9 controller files)    │
        │ - UserController       │
        │ - ManagerController    │
        │ - ProjController       │
        │ - TaskController       │
        │ - SubTaskController    │
        │ - EmployeeController   │
        │ - CommentsController   │
        │ - NotificationController│
        │ - AiController         │
        └────────┬────────────────┘
                 │
        ┌────────▼──────────────────────┐
        │  Helper & Service Layer       │
        │ - notifyUser (DB + Socket)    │
        │ - updateProjectProgress       │
        │ - updateTaskProgress          │
        │ - updateSubtaskProgress       │
        │ - sendEmail (Nodemailer)      │
        │ - JWT utilities               │
        └────────┬──────────────────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
┌───▼────┐  ┌────▼────┐  ┌───▼──────┐
│ MongoDB │  │ Cloudinary│  │ Nodemailer│
│ (Data)  │  │ (Files)  │  │ (Email)  │
└─────────┘  └──────────┘  └──────────┘
```

### Directory Structure

```
backend/
├── Controller/                    # Business Logic Layer
│   ├── AiController.js           # AI features (GenerativeAI integration)
│   ├── CommentsController.js     # Comment CRUD operations
│   ├── EmployeeController.js     # Employee-specific operations
│   ├── ManagerController.js      # Manager operations (projects, invites)
│   ├── NotificationController.js # Notification fetch & management
│   ├── ProjController.js         # Project CRUD & analytics
│   ├── SubTaskController.js      # SubTask CRUD & status management
│   ├── TaskController.js         # Task/Milestone CRUD & management
│   └── UserController.js         # User auth (register, login, logout)
│
├── Route/                         # API Route Definitions
│   ├── AiRoute.js
│   ├── CommentsRoute.js
│   ├── EmployeeRoute.js
│   ├── ManagerRoute.js
│   ├── NotificationRoute.js
│   ├── ProjectRoute.js
│   ├── SubTaskRoute.js
│   ├── TaskRoute.js
│   └── UserRoute.js
│
├── Modal/                         # Mongoose Data Models
│   ├── User.js                   # User schema
│   ├── ProjectModal.js           # Project schema
│   ├── TaskModal.js              # Task schema
│   ├── SubTaskModal.js           # SubTask schema
│   ├── NotificationModal.js      # Notification schema
│   ├── CommentsModal.js          # Comment schema
│   └── Timelog.js                # Time tracking schema
│
├── Middleware/                    # Authentication & Authorization
│   ├── requireAuth.js            # JWT verification middleware
│   └── requiredrole.js           # Role-based access control
│
├── helper/                        # Helper Functions & Utilities
│   ├── notifyUser.js             # Send notifications (DB + Socket + Email)
│   ├── projrectprogresshelper.js # Calculate project progress
│   ├── taskprogresshelper.js     # Calculate task progress
│   ├── subtaskprogresshelper.js  # Calculate subtask progress
│   └── SubTaskChangeProgressHelper.js
│
├── utils/                         # Utility Functions
│   ├── jwtutils.js               # JWT sign/verify functions
│   └── sendMailutils.js          # Email sending utility
│
├── config/                        # Configuration Files
│   ├── cloudinaryconfig.js       # Cloudinary file upload config
│   ├── db.js                     # MongoDB connection
│   ├── generativeaiconfig.js     # Generative AI (GPT) config
│   ├── nodeMailerConfig.js       # SMTP email configuration
│   └── roles.js                  # Role definitions
│
├── socket/                        # Real-Time Features
│   └── socket.js                 # Socket.IO setup & management
│
├── docs/                          # Documentation
│   ├── ProjectManagementSystem_MDC.md
│   └── ProjectManagementSystem_Complete_MDC.md (this file)
│
├── api/                           # API Entry Point
│   └── index.js
│
├── index.js                       # Server Entry Point
├── package.json                   # Dependencies
├── vercel.json                    # Vercel deployment config
└── .env                           # Environment variables (not in repo)
```

---

## Technology Stack

### Backend Framework
- **Node.js** - JavaScript runtime
- **Express.js** - HTTP server framework
- **Mongoose** - MongoDB ODM (Object Data Mapping)

### Database
- **MongoDB** - NoSQL document database
- **MongoDB Atlas** - Cloud-hosted MongoDB

### Authentication & Security
- **JWT (JSON Web Tokens)** - Stateless authentication
- **bcryptjs** - Password hashing (implied from auth flow)
- **CORS** - Cross-Origin Resource Sharing

### Real-Time Communication
- **Socket.IO** - WebSocket library for real-time updates
- **Socket.IO with JWT** - Secure handshake authentication

### File Management
- **Cloudinary** - Cloud storage for file uploads
- **Multer** - Middleware for file upload handling

### Email Services
- **Nodemailer** - SMTP email service
- **Custom Email Templates** - HTML-formatted emails

### AI Integration
- **Generative AI API** - For AI features (GPT/Claude integration)

### Development & Deployment
- **dotenv** - Environment variable management
- **cookie-parser** - Cookie handling middleware
- **Vercel** - Serverless deployment platform

---

## Data Models & Schema

### 1. User Model

**Purpose**: Store user account information with role-based access.

```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  password: String (bcrypt hashed),
  role: String (enum: ['manager', 'employee']),
  status: String (enum: ['active', 'inactive']),
  avatarUrl: String (optional),
  createdAt: Date,
  updatedAt: Date
}
```

**Role Definitions**:
- **Manager**: Creates projects, assigns tasks, manages team members
- **Employee**: Works on assigned tasks, updates task status

---

### 2. Project Model

**Purpose**: Core project container with metadata, team, and files.

```javascript
{
  _id: ObjectId,
  name: String,
  description: String (optional),
  createdBy: ObjectId (ref: User) ← Project Manager
  team: [
    {
      user: ObjectId (ref: User),
      role: String ('manager' | 'employee')
    }
  ],
  teamName: String (optional),
  files: [
    {
      filename: String,
      url: String (Cloudinary URL),
      mimetype: String,
      size: Number,
      uploadedBy: ObjectId (ref: User),
      uploadedAt: Date
    }
  ],
  budget: {
    estimated: Number,
    actual: Number
  },
  startDate: Date,
  endDate: Date (optional),
  priority: String (enum: ['low', 'medium', 'high']),
  projectStatus: String (enum: ['draft', 'active', 'on-hold', 'completed', 'archived']),
  progress: Number (0-100) ← Auto-calculated
  createdAt: Date,
  updatedAt: Date
}
```

**Relationships**:
- 1:N with Task (one project has many tasks)
- N:M with User (many users in team)
- Has files array (embedded documents)

---

### 3. Task Model (Milestones)

**Purpose**: Major deliverables or milestones within a project.

```javascript
{
  _id: ObjectId,
  title: String,
  description: String (optional),
  project: ObjectId (ref: Project),
  createdBy: ObjectId (ref: User) ← Task Creator/Manager
  assignees: [
    {
      user: ObjectId (ref: User),
      role: String ('manager' | 'employee')
    }
  ],
  status: String (enum: ['todo', 'in-progress', 'review', 'completed']),
  priority: String (enum: ['low', 'medium', 'high']),
  startDate: Date,
  dueDate: Date,
  estimatedHours: Number,
  progress: Number (0-100) ← Auto-calculated from subtasks
  dependencies: [ObjectId] (ref: Task),
  attachments: [
    {
      filename: String,
      url: String,
      uploadedBy: ObjectId (ref: User)
    }
  ],
  comments: [ObjectId] (ref: Comment),
  timeLogs: [ObjectId] (ref: TimeLog),
  createdAt: Date,
  updatedAt: Date
}
```

**Status Workflow**:
```
todo → in-progress → review → completed
```

**Progress Calculation**:
```
Task Progress = (Completed SubTasks / Total SubTasks) × 100
```

---

### 4. SubTask Model

**Purpose**: Individual work items within a task.

```javascript
{
  _id: ObjectId,
  title: String,
  description: String (optional),
  task: ObjectId (ref: Task),
  assignees: [
    {
      user: ObjectId (ref: User),
      role: String
    }
  ],
  status: String (enum: ['todo', 'in-progress', 'review', 'completed']),
  priority: String (enum: ['low', 'medium', 'high']),
  dueDate: Date,
  estimatedHours: Number,
  progress: Number (0-100),
  dependencies: [ObjectId] (ref: SubTask),
  attachments: [
    {
      filename: String,
      url: String,
      uploadedBy: ObjectId (ref: User)
    }
  ],
  comments: [ObjectId] (ref: Comment),
  timeLogs: [ObjectId] (ref: TimeLog),
  createdAt: Date,
  updatedAt: Date
}
```

---

### 5. Notification Model

**Purpose**: Store notifications for user actions and system events.

```javascript
{
  _id: ObjectId,
  recipient: ObjectId (ref: User) ← Who receives
  type: String (enum: [
    'task-assigned',
    'subtask-assigned',
    'status-updated',
    'comment-added',
    'project-assigned',
    'project-invite',
    'project-updated',
    'project-deleted',
    'file-uploaded',
    'deadline-approaching'
  ]),
  title: String,
  message: String,
  relatedProject: ObjectId (ref: Project) (optional),
  relatedTask: ObjectId (ref: Task) (optional),
  relatedSubTask: ObjectId (ref: SubTask) (optional),
  link: String (frontend navigation link),
  isRead: Boolean (default: false),
  readAt: Date (optional),
  emailSent: Boolean (default: false),
  createdAt: Date,
  updatedAt: Date
}
```

---

### 6. Comment Model

**Purpose**: Comments and discussions on tasks/subtasks.

```javascript
{
  _id: ObjectId,
  text: String,
  author: ObjectId (ref: User),
  task: ObjectId (ref: Task) (optional),
  subTask: ObjectId (ref: SubTask) (optional),
  createdAt: Date,
  updatedAt: Date
}
```

---

### 7. TimeLog Model

**Purpose**: Track time spent on tasks/subtasks.

```javascript
{
  _id: ObjectId,
  user: ObjectId (ref: User),
  task: ObjectId (ref: Task) (optional),
  subTask: ObjectId (ref: SubTask) (optional),
  startTime: Date,
  endTime: Date,
  duration: Number (in hours),
  notes: String (optional),
  createdAt: Date,
  updatedAt: Date
}
```

---

## Module Overview

### Controllers

#### 1. **UserController** - Authentication & User Management
**File**: `Controller/UserController.js`

**Methods**:
- `registerEmployee(req, res)` - Register new employee account
- `registerManager(req, res)` - Register new manager account
- `loginEmployee(req, res)` - Employee login (JWT token generation)
- `loginManager(req, res)` - Manager login (JWT token generation)
- `logout(req, res)` - Logout (clear session)
- `getUserData(req, res)` - Fetch current user profile

**Validation**:
- Email format validation
- Password strength checking
- Duplicate email prevention
- Role validation

---

#### 2. **ManagerController** - Project & Team Management
**File**: `Controller/ManagerController.js`

**Methods**:
- `createProject(req, res)` - Create new project with team members
  - **Notifications**: Notifies all added team members (type: `project-assigned`)
  - **Payload**: name, description, startDate, endDate, budget, priority, memberIds
  
- `fetchProjectByManagerId(req, res)` - Get all projects created by manager
  
- `InviteMembersByProjectId(req, res)` - Add members to existing project
  - **Notifications**: Notifies invited members (type: `project-invite`)
  - **Payload**: members array with user details, projectId

- `fetchAllManagers(req, res)` - List all managers in system
  
- `fetchAllEmployees(req, res)` - List all employees in system
  
- `fetchEmployeesByQuery(req, res)` - Search employees by name/email

---

#### 3. **ProjController** - Project Operations & Reporting
**File**: `Controller/ProjController.js`

**Methods**:
- `fetchProjectReportById(req, res)` - Advanced analytics report
  - Includes: team size, task metrics, progress breakdown, timeline analysis
  - Uses MongoDB aggregation pipeline
  
- `fetchProjectDetailsById(req, res)` - Full project details with relationships
  - Populates: createdBy, files.uploadedBy, team.user, tasks
  
- `fetchFilesByProjectId(req, res)` - Get all project files
  
- `fetchMilestonesByProjectId(req, res)` - Get all tasks in project
  - Populates: assignees, dependencies, attachments
  
- `updateProjectDetailsById(req, res)` - Update project metadata
  - **Notifications**: Notifies team & creator (type: `project-updated`)
  - Updates: name, description, budget, dates, status, priority
  - Recalculates progress via helper
  
- `deleteProjectById(req, res)` - Delete project (soft delete recommended)
  - **Notifications**: Notifies team & creator (type: `project-deleted`)
  
- `uploadfilesByProjectId(req, res)` - Upload files to project
  - **Missing**: Should notify team (TODO)
  - Integration: Cloudinary file upload

---

#### 4. **TaskController** - Task/Milestone Management
**File**: `Controller/TaskController.js`

**Methods**:
- `createTask(req, res)` - Create new task in project
  - **Notifications**: Notifies assignees (type: `task-assigned`)
  - Includes: title, description, assignees, priority, dates
  
- `fetchtasksbyProjectId(req, res)` - Get all tasks in project
  
- `fetchTaskByID(req, res)` - Get single task details
  
- `updateManagerTaskByID(req, res)` - Manager updates task
  - **Notifications**: Notifies assignees (type: `task-updated`)
  - Includes actor name in message
  
- `updateEmployeeTaskByID(req, res)` - Employee updates task
  - **Notifications**: Notifies task creator
  - Recalculates progress
  
- `deleteTaskById(req, res)` - Delete task
  - **Notifications**: Notifies assignees & creator (type: `task-deleted`)
  
- `uploadfilesByTaskId(req, res)` - Upload files to task
  - **Notifications**: Notifies assignees & creator (type: `file-uploaded`)

---

#### 5. **SubTaskController** - SubTask Management
**File**: `Controller/SubTaskController.js`

**Methods**:
- `CreateSubTask(req, res)` - Create new subtask
  - **Notifications**: Notifies assignees (type: `subtask-assigned`)
  - Includes actor name
  
- `getSubTasksByTaskId(req, res)` - Get all subtasks in task
  
- `getSubTaskBySubId(req, res)` - Get single subtask
  
- `updateManagerSubTaskByID(req, res)` - Manager updates subtask
  - **Notifications**: Notifies assignees
  
- `updateEmployeeSubTaskByID(req, res)` - Employee updates subtask
  - **Notifications**: Notifies manager/creator
  
- `updateEmployeeSubTaskStatusById(req, res)` - Employee changes status
  - **Notifications**: Notifies manager (type: `status-updated`)
  - Triggers progress cascade: SubTask → Task → Project
  
- `updateManagerSubTaskStatusById(req, res)` - Manager changes status
  - **Notifications**: Notifies assignees
  
- `deleteSubTaskById(req, res)` - Delete subtask
  - **Notifications**: Notifies assignees & creator (type: `subtask-deleted`)

---

#### 6. **EmployeeController** - Employee-Specific Operations
**File**: `Controller/EmployeeController.js`

**Methods**:
- Fetch assigned tasks
- Update task status
- View project/task details
- Submit time logs
- View personal workload

---

#### 7. **CommentsController** - Comment Management
**File**: `Controller/CommentsController.js`

**Methods**:
- `addComment(req, res)` - Add comment to task/subtask
  - **Notifications**: Notifies task team
  
- `getCommentsByTaskId(req, res)` - Get comments on task
  
- `deleteComment(req, res)` - Delete comment
  
- `updateComment(req, res)` - Update comment

---

#### 8. **NotificationController** - Notification Management
**File**: `Controller/NotificationController.js`

**Methods**:
- `getUnreadNotifications(req, res)` - Get unread notifications for user
  
- `getAllNotifications(req, res)` - Get all notifications (paginated)
  
- `markAsRead(req, res)` - Mark single notification as read
  
- `markAllAsRead(req, res)` - Mark all notifications as read
  
- `deleteNotification(req, res)` - Delete notification

---

#### 9. **AiController** - AI Features
**File**: `Controller/AiController.js`

**Methods**:
- AI-assisted task suggestions
- Project analysis & recommendations
- Generative AI integration (GPT/Claude)

---

### Helpers & Utilities

#### **notifyUser** - Universal Notification Handler
**File**: `helper/notifyUser.js`

**Function Signature**:
```javascript
notifyUser({
  type: String,           // Notification type
  message: String,        // User-facing message
  recipientId: ObjectId,  // Recipient user ID
  project: ObjectId,      // Related project (optional)
  task: ObjectId,         // Related task (optional)
  subTask: ObjectId,      // Related subtask (optional)
  title: String,          // Notification title
  link: String,           // Relative navigation link
  emailLink: String       // Full URL for email
})
```

**Workflow**:
```
1. Create Notification in DB (persistent storage)
2. Send email via Nodemailer (with HTML template)
3. Get Socket.IO instance
4. Emit real-time event to user's personal room
5. Graceful error handling (doesn't block API response)
```

**Delivery Guarantee**:
- ✅ DB persistence (recovery for offline users)
- ✅ Real-time socket emission (if user online)
- ✅ Email fallback (if user offline or socket fails)

---

#### **Progress Calculation Helpers**

**updateProjectProgress** - `helper/projrectprogresshelper.js`
```javascript
updateProjectProgress(projectId)
  → Count completed tasks
  → Total tasks
  → Progress = (Completed / Total) × 100
  → Update Project.progress
  → Update Project.projectStatus (based on progress)
```

**updateTaskProgress** - `helper/taskprogresshelper.js`
```javascript
updateTaskProgress(taskId)
  → Count completed subtasks
  → Total subtasks
  → Progress = (Completed / Total) × 100
  → Update Task.progress
```

**updateSubtaskProgress** - `helper/subtaskprogresshelper.js`
```javascript
updateSubtaskProgress(subTaskId)
  → Optional: track individual subtask progress
  → Propagate to parent task
```

---

### Middleware

#### **requireAuth** - JWT Verification
**File**: `Middleware/requireAuth.js`

**Purpose**: Verify JWT token in request header and extract user data.

**Process**:
1. Extract token from `Authorization: Bearer <token>` header
2. Verify token signature using secret key
3. Decode token to get user data (id, email, name, role)
4. Set `req.user` for use in controllers
5. Return 401 if token missing/invalid

---

#### **requireRole** - Role-Based Access Control
**File**: `Middleware/requiredrole.js`

**Purpose**: Restrict routes to specific roles.

**Usage**:
```javascript
router.post('/create-project', 
  requireAuth, 
  requireRole(['manager']), 
  createProject
)
```

---

### Socket.IO Setup

**File**: `socket/socket.js`

**Key Features**:

1. **JWT Authentication in Handshake**
   ```javascript
   socket.handshake.auth.token → Verify JWT
   Extract userId from token → Auto-join user room
   ```

2. **User Room Management**
   ```javascript
   User A joins room "userId_A"
   socket.io emits to room:
   io.to("userId_A").emit('new-notification', {...})
   ```

3. **Online User Tracking**
   ```javascript
   onlineUsers = {
     userId_A: socketId_1,
     userId_B: socketId_2
   }
   ```

4. **CORS Configuration**
   ```javascript
   Restricted to FRONTEND_URL (environment variable)
   Prevents unauthorized WebSocket connections
   ```

5. **Exported Functions**
   ```javascript
   getIO() → Returns io instance for use in controllers
   onlineUsers → Map of online users for checking status
   ```

---

## API Endpoints

### Authentication Routes (`/api/auth`)

| Method | Endpoint | Auth | Controller | Purpose |
|--------|----------|------|-----------|---------|
| POST | `/register-employee` | None | UserController | Register employee account |
| POST | `/register-manager` | None | UserController | Register manager account |
| POST | `/login-employee` | None | UserController | Employee login (JWT) |
| POST | `/login-manager` | None | UserController | Manager login (JWT) |
| POST | `/logout` | Yes | UserController | Logout |
| GET | `/get-user` | Yes | UserController | Get current user profile |

---

### Manager Routes (`/api/manager`)

| Method | Endpoint | Auth | Role | Controller | Purpose |
|--------|----------|------|------|-----------|---------|
| POST | `/create-project` | Yes | Manager | ManagerController | Create new project |
| GET | `/all-projects` | Yes | Manager | ManagerController | Get created projects |
| POST | `/:projectId/invite-members` | Yes | Manager | ManagerController | Add team members |
| GET | `/all-managers` | Yes | Any | ManagerController | List managers |
| GET | `/all-employees` | Yes | Any | ManagerController | List employees |
| GET | `/search-employees` | Yes | Any | ManagerController | Search employees |

---

### Project Routes (`/api/project`)

| Method | Endpoint | Auth | Controller | Purpose |
|--------|----------|------|-----------|---------|
| GET | `/:id/report` | Yes | ProjController | Project analytics report |
| GET | `/:id/details` | Yes | ProjController | Full project details |
| GET | `/:id/files` | Yes | ProjController | Get project files |
| GET | `/:id/milestones` | Yes | ProjController | Get all tasks |
| PUT | `/:id` | Yes | ProjController | Update project metadata |
| DELETE | `/:id` | Yes | ProjController | Delete project |
| POST | `/:id/upload-files` | Yes | ProjController | Upload files |

---

### Task Routes (`/api/tasks`)

| Method | Endpoint | Auth | Controller | Purpose |
|--------|----------|------|-----------|---------|
| POST | `/create-task/:projectId` | Yes | TaskController | Create task/milestone |
| GET | `/:projectId/tasks` | Yes | TaskController | Get all tasks in project |
| GET | `/:taskId` | Yes | TaskController | Get single task |
| PUT | `/manager/:taskId` | Yes | TaskController | Manager updates task |
| PUT | `/employee/:taskId` | Yes | TaskController | Employee updates task |
| DELETE | `/:taskId` | Yes | TaskController | Delete task |
| POST | `/:taskId/upload` | Yes | TaskController | Upload files to task |

---

### SubTask Routes (`/api/subTask`)

| Method | Endpoint | Auth | Controller | Purpose |
|--------|----------|------|-----------|---------|
| POST | `/create-subTask/:taskId` | Yes | SubTaskController | Create subtask |
| GET | `/:taskId` | Yes | SubTaskController | Get subtasks by task |
| GET | `/id/:subTaskId` | Yes | SubTaskController | Get single subtask |
| PUT | `/manager/:subTaskId` | Yes | SubTaskController | Manager updates |
| PUT | `/employee/:subTaskId` | Yes | SubTaskController | Employee updates |
| DELETE | `/:subTaskId` | Yes | SubTaskController | Delete subtask |
| PATCH | `/manager/status/:subTaskId` | Yes | SubTaskController | Manager changes status |
| PATCH | `/employee/status/:subTaskId` | Yes | SubTaskController | Employee changes status |

---

### Notification Routes (`/api/notifications`)

| Method | Endpoint | Auth | Controller | Purpose |
|--------|----------|------|-----------|---------|
| GET | `/unread` | Yes | NotificationController | Get unread notifications |
| GET | `/all` | Yes | NotificationController | Get all notifications |
| PATCH | `/mark-read/:id` | Yes | NotificationController | Mark single as read |
| PATCH | `/mark-all-read` | Yes | NotificationController | Mark all as read |
| DELETE | `/:id` | Yes | NotificationController | Delete notification |

---

### Comment Routes (`/api/comments`)

| Method | Endpoint | Auth | Controller | Purpose |
|--------|----------|------|-----------|---------|
| POST | `/add-comment` | Yes | CommentsController | Add comment |
| GET | `/task/:taskId` | Yes | CommentsController | Get task comments |
| GET | `/subtask/:subTaskId` | Yes | CommentsController | Get subtask comments |
| DELETE | `/:commentId` | Yes | CommentsController | Delete comment |

---

## Workflow Flows

### Flow 1: Project Creation with Team Assignment

```
Manager UI
    │
    ├─ POST /api/manager/create-project
    │  {
    │    name: "Website Redesign",
    │    description: "...",
    │    startDate: "2025-01-01",
    │    endDate: "2025-03-31",
    │    memberIds: [emp1, emp2, emp3]
    │  }
    │
    ▼
ManagerController.createProject()
    │
    ├─ Verify manager role
    ├─ Validate members exist
    ├─ Create Project document in MongoDB
    │
    ├─ For each team member (except manager):
    │  └─ notifyUser({
    │      type: 'project-assigned',
    │      message: 'You have been added to project "..."',
    │      recipientId: memberId,
    │      title: 'Added to Project'
    │    })
    │
    ├─ Each notification:
    │  ├─ Save to Notification collection
    │  ├─ Send email via Nodemailer
    │  └─ Emit to socket room (if online)
    │
    ▼
Response: { SuccessMessage, project }
    │
    ▼
Employee receives:
├─ Real-time socket event (if online)
├─ Email notification (fallback)
└─ DB notification (persistent)
```

---

### Flow 2: Task Creation & Subtask Assignment

```
Manager creates Task
    │
    ├─ POST /api/tasks/create-task/:projectId
    │  {
    │    title: "Homepage UI Design",
    │    assignees: [emp1, emp2],
    │    dueDate: "2025-02-15",
    │    priority: "high"
    │  }
    │
    ▼
TaskController.createTask()
    │
    ├─ Validate project exists
    ├─ Create Task document
    │
    ├─ For each assignee:
    │  └─ notifyUser({
    │      type: 'task-assigned',
    │      message: 'You assigned to task "..."',
    │      recipientId: assigneeId
    │    })
    │
    ├─ updateProjectProgress(projectId)
    │
    ▼
Response: { SuccessMessage, task }

---

Manager creates SubTask
    │
    ├─ POST /api/subTask/create-subTask/:taskId
    │  {
    │    title: "Header Section Design",
    │    assignees: [emp1],
    │    estimatedHours: 4
    │  }
    │
    ▼
SubTaskController.CreateSubTask()
    │
    ├─ Validate task exists
    ├─ Create SubTask document
    │
    ├─ notifyUser(assignee, type: 'subtask-assigned')
    │
    ├─ updateTaskProgress(taskId)
    ├─ updateProjectProgress(projectId)
    │
    ▼
Real-Time Updates Cascade:
├─ SubTask Progress: 0% (created)
├─ Task Progress: X% (depends on completed subtasks)
├─ Project Progress: Y% (depends on completed tasks)
```

---

### Flow 3: Employee Updates Subtask Status

```
Employee updates status: todo → in-progress
    │
    ├─ PATCH /api/subTask/employee/status/:subTaskId
    │  { status: 'in-progress' }
    │
    ▼
SubTaskController.updateEmployeeSubTaskStatusById()
    │
    ├─ Validate subtask exists
    ├─ Update status field
    │
    ├─ notifyUser({
    │    recipientId: taskCreatorId,
    │    type: 'status-updated',
    │    message: 'SubTask "..." moved to in-progress by [Actor]'
    │  })
    │
    ├─ updateSubtaskProgress(subTaskId)
    ├─ updateTaskProgress(taskId)
    ├─ updateProjectProgress(projectId)
    │
    ▼
Progress Cascade (Example):
├─ If all subtasks completed:
│  └─ Task Progress = 100%
│     └─ If all tasks completed:
│        └─ Project Progress = 100%
│           └─ Project Status = 'completed'
│
▼
Manager receives real-time notifications + email
```

---

### Flow 4: Real-Time Notification Delivery

```
Server calls notifyUser({ recipientId, type, message, ... })
    │
    ├─ 1. Save to DB (Notification collection)
    │  └─ Ensures durability & recovery
    │
    ├─ 2. Get Socket.IO instance
    │  └─ io = getIO()
    │
    ├─ 3. Build payload
    │  └─ { _id, type, title, message, createdAt, link }
    │
    ├─ 4. Emit to user's personal room
    │  └─ io.to(recipientId).emit('new-notification', payload)
    │
    ├─ 5. Send email via Nodemailer
    │  ├─ Fetch user email
    │  └─ sendEmail({ to, subject, html })
    │
    ▼
Delivery Outcomes:
├─ If user online (connected socket):
│  └─ Receives real-time notification immediately
│
├─ If user offline:
│  ├─ Email sent as fallback
│  └─ Notification in DB (fetched on next login)
│
▼
User Experience:
├─ Frontend socket listener:
│  └─ socket.on('new-notification', (data) => {
│      updateNotificationBell();
│      showToast(data.message);
│    })
│
├─ Email contains:
│  ├─ Professional HTML template
│  ├─ Action button (link)
│  └─ Fallback URL text
```

---

## Real-Time Features

### Socket.IO Integration

**Server Setup** (`index.js`):
```javascript
const http = require('http');
const express = require('express');
const { initSocket } = require('./socket/socket');

const app = express();
const server = http.createServer(app);
const io = initSocket(server);

server.listen(PORT, () => {
  console.log('✅ Server with WebSocket started');
});
```

**Socket Initialization** (`socket/socket.js`):
```javascript
const { Server } = require('socket.io');
const { verifyAccessToken } = require('../utils/jwtutils');

const onlineUsers = {}; // Track online users

function initSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    // Verify JWT in handshake
    const token = socket.handshake.auth.token;
    const decoded = verifyAccessToken(token);
    const userId = decoded._id || decoded.id || decoded.userId;

    // Auto-join personal room
    socket.join(userId.toString());

    // Track online user
    onlineUsers[userId] = socket.id;

    // Broadcast online status
    io.emit('user-online', { userId });
  });

  return io;
}

function getIO() {
  return io; // Exported for use in controllers
}

module.exports = { initSocket, getIO, onlineUsers };
```

**Frontend Usage**:
```javascript
// Client connects with token
const socket = io(SERVER_URL, {
  auth: {
    token: localStorage.getItem('jwt_token')
  }
});

// Listen for notifications
socket.on('new-notification', (notification) => {
  console.log('New notification:', notification);
  notificationBell.update();
  showToast(notification.message);
});

// Handle disconnection
socket.on('disconnect', () => {
  console.log('Socket disconnected');
});
```

---

## Security & Authentication

### JWT Token Flow

```
1. User Login
   └─ POST /api/auth/login-manager
      {email, password}

2. Server Verification
   ├─ Find user by email
   ├─ Verify bcrypt hashed password
   ├─ Extract user ID, email, role, name

3. Token Generation
   └─ jwt.sign({
       _id: user._id,
       email: user.email,
       role: user.role,
       name: user.name
      }, JWT_SECRET, { expiresIn: '7d' })

4. Token Storage (Frontend)
   ├─ localStorage.setItem('token', jwt)
   └─ (Recommendation: Use httpOnly cookies instead)

5. Token Usage in Requests
   ├─ Every API request includes:
   └─ Authorization: Bearer <jwt>

6. Token Verification (Backend)
   ├─ requireAuth middleware extracts token
   ├─ Verifies signature with JWT_SECRET
   ├─ Extracts user data
   └─ Sets req.user for controller use

7. Token Expiration
   └─ After 7 days, user must log in again
```

---

### Role-Based Access Control

```
User Roles:
├─ Manager
│  ├─ Create projects
│  ├─ Assign tasks
│  ├─ Update task status
│  ├─ Delete tasks
│  └─ Manage team
│
└─ Employee
   ├─ View assigned tasks
   ├─ Update task status
   ├─ Add comments
   ├─ Upload files
   └─ Log time
```

**Middleware Protection**:
```javascript
// Requires JWT token
app.use(requireAuth);

// Requires manager role
router.post(
  '/create-project',
  requireAuth,
  requireRole(['manager']),
  ManagerController.createProject
);
```

---

### Password Security

**Assumption**: Passwords are hashed with bcryptjs before storing.

**Best Practices**:
- ✅ Hash passwords (bcrypt, not plain text)
- ✅ Use strong JWT secret (256+ bits)
- ✅ Implement token refresh mechanism
- ✅ Use HTTPS in production
- ✅ Implement rate limiting on auth endpoints

---

## Error Handling & Validation

### Current Implementation

**Controller Error Handling**:
```javascript
try {
  // Business logic
  res.status(200).json({ SuccessMessage, data });
} catch (error) {
  console.log(error);
  res.status(500).json({ FailureMessage: "Internal server error" });
}
```

**Issues**:
- ❌ Generic error messages (no specific error codes)
- ❌ Error details logged to console (security risk)
- ❌ No input validation before processing
- ❌ No request logging

---

### Recommended Improvements

**Use Joi or express-validator for input validation**:
```javascript
const schema = Joi.object({
  name: Joi.string().required().min(3).max(100),
  email: Joi.string().email().required(),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).required()
});

const { error, value } = schema.validate(req.body);
if (error) {
  return res.status(400).json({ 
    FailureMessage: error.details[0].message 
  });
}
```

---

## Current Implementation Status

### ✅ Fully Implemented

| Feature | Controller | Status |
|---------|-----------|--------|
| User Authentication | UserController | ✅ Complete |
| Project CRUD | ProjController, ManagerController | ✅ Complete |
| Task CRUD | TaskController | ✅ Complete |
| SubTask CRUD | SubTaskController | ✅ Complete |
| Real-Time Notifications | notifyUser, socket.js | ✅ Complete |
| Email Notifications | notifyUser, sendMailutils | ✅ Complete |
| File Uploads | Cloudinary integration | ✅ Complete |
| Progress Calculation | Helper functions | ✅ Complete |
| Team Management | ManagerController | ✅ Complete |
| Comments | CommentsController | ✅ Complete |
| Time Logging (DB refs) | TaskModal, SubTaskModal | ✅ Partial |

---

### ⚠️ Partially Implemented

| Feature | Status | Issue |
|---------|--------|-------|
| Notifications | ⚠️ Partial | uploadfilesByProjectId doesn't notify |
| Access Control | ⚠️ Partial | No ownership checks in fetch endpoints |
| Input Validation | ⚠️ Minimal | No Joi or express-validator |
| Error Handling | ⚠️ Basic | Generic error messages |
| Rate Limiting | ❌ None | No rate limit middleware |

---

### ❌ Not Implemented

| Feature | Reason |
|---------|--------|
| Soft Delete | Not required yet |
| Task Dependencies | Model refs exist, no validation |
| Gantt Chart Data | Not requested |
| Burndown Charts | Not requested |
| Budget Alerts | Not requested |
| Deadline Escalation | Not requested |
| Slack/Teams Integration | Not requested |
| Export to PDF/Excel | Not requested |

---

## Known Issues & Limitations

### Critical Issues

1. **⚠️ Missing uploadfilesByProjectId Notifications**
   - **Location**: `ProjController.js:471`
   - **Impact**: Team members don't get notified when files are uploaded to projects
   - **Fix**: Add notifyUser call in uploadfilesByProjectId
   - **Priority**: HIGH

2. **⚠️ No Ownership Validation in Fetch Endpoints**
   - **Location**: `ProjController.js:46, 93`
   - **Impact**: Any authenticated user can fetch any project details
   - **Fix**: Add middleware to verify user is in project team
   - **Priority**: HIGH

3. **⚠️ Missing uploadedBy in Project File Uploads**
   - **Location**: `ProjController.js:253`
   - **Impact**: Cannot track who uploaded files to projects
   - **Fix**: Add `uploadedBy: req.user._id` to file object
   - **Priority**: MEDIUM

---

### Medium Priority Issues

1. **⚠️ No Input Validation**
   - **Impact**: Invalid data can be saved to database
   - **Fix**: Add Joi schema validation to all routes
   - **Priority**: MEDIUM

2. **⚠️ Generic Error Messages**
   - **Impact**: Difficult to debug issues
   - **Fix**: Add specific error codes and messages
   - **Priority**: MEDIUM

3. **⚠️ No Rate Limiting**
   - **Impact**: Vulnerable to brute force attacks
   - **Fix**: Add express-rate-limit middleware
   - **Priority**: MEDIUM

---

### Low Priority Issues

1. **JWT Token in localStorage**
   - **Recommendation**: Use httpOnly cookies for better security
   - **Impact**: Token accessible to XSS attacks
   - **Priority**: LOW

2. **Hard Delete vs Soft Delete**
   - **Current**: Hard delete projects
   - **Recommendation**: Implement soft delete with isDeleted flag
   - **Priority**: LOW

3. **No Request Logging**
   - **Recommendation**: Add morgan or winston logger
   - **Priority**: LOW

---

## Recommended Improvements

### Phase 1: Security & Stability (Week 1-2)

1. **Add Input Validation**
   ```bash
   npm install joi
   ```
   - Validate all request payloads
   - Check date ranges, string lengths, enum values
   - Provide specific error messages

2. **Add Access Control**
   - Verify user is team member before fetching project details
   - Check ownership before updating/deleting
   - Implement project-level middleware

3. **Fix Missing Notifications**
   - Add notifications to uploadfilesByProjectId
   - Add uploadedBy to project file uploads
   - Add notifications to comments

4. **Add Rate Limiting**
   ```bash
   npm install express-rate-limit
   ```
   - Limit auth endpoints (5 attempts/15 min)
   - Limit API endpoints (100 requests/15 min)

---

### Phase 2: Features (Week 3-4)

1. **Implement Timesheet Endpoints**
   - GET /api/timelog/my-logs (get user's time logs)
   - POST /api/timelog (create time log)
   - GET /api/timelog/task/:taskId (get task time logs)

2. **Add Workload Balancing**
   - GET /api/employee/workload (tasks per employee)
   - GET /api/project/:id/workload (team workload)

3. **Implement Soft Delete**
   - Add isDeleted flag to schemas
   - Filter deleted items in queries
   - Add restore endpoint

4. **Add Task Dependencies Validation**
   - Prevent circular dependencies
   - Check task order on creation
   - Update status based on dependencies

---

### Phase 3: Analytics (Week 5-6)

1. **Gantt Chart Data Endpoint**
   - GET /api/project/:id/gantt
   - Return tasks with start/end dates
   - Include progress and status

2. **Burndown Chart Data**
   - GET /api/project/:id/burndown
   - Return daily completed tasks
   - Compare vs planned vs actual

3. **Team Performance Analytics**
   - GET /api/manager/:managerId/analytics
   - Task completion rate per employee
   - Average time to complete tasks
   - Performance trends

---

### Phase 4: Integrations (Week 7-8)

1. **Slack Integration**
   - POST notifications to Slack channel
   - Allow Slack commands to update tasks

2. **Email Integration**
   - Recurring email digests (daily/weekly)
   - Overdue task alerts
   - Weekly summary reports

3. **Export Features**
   - Export project as PDF
   - Export tasks as CSV/Excel
   - Generate project report as PDF

---

## Quick Start & Testing Guide

### Environment Setup

**Create .env file** in backend root:
```env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/project-management

# JWT
JWT_SECRET=your-super-secret-key-at-least-256-bits-long

# Frontend
FRONTEND_URL=http://localhost:3000

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Email (Nodemailer)
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# AI (Generative AI)
GENERATIVE_AI_API_KEY=your-ai-api-key

# Server
PORT=8080
NODE_ENV=development
```

---

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start
```

---

### Testing Workflow

**1. Register & Login**
```bash
curl -X POST http://localhost:8080/api/auth/register-manager \
  -H "Content-Type: application/json" \
  -d {
    "name": "John Manager",
    "email": "manager@example.com",
    "password": "SecurePass123",
    "role": "manager"
  }

# Login and get JWT token
curl -X POST http://localhost:8080/api/auth/login-manager \
  -H "Content-Type: application/json" \
  -d {
    "email": "manager@example.com",
    "password": "SecurePass123"
  }

# Response: { token: "eyJhbGc..." }
```

**2. Create Project**
```bash
curl -X POST http://localhost:8080/api/manager/create-project \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d {
    "name": "Website Redesign",
    "description": "Redesign company website",
    "startDate": "2025-01-01",
    "endDate": "2025-03-31",
    "priority": "high",
    "memberIds": ["emp-id-1", "emp-id-2"]
  }

# Response: { SuccessMessage, project }
```

**3. Create Task**
```bash
curl -X POST http://localhost:8080/api/tasks/create-task/:projectId \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d {
    "title": "Homepage Design",
    "description": "Design homepage mockups",
    "assignees": ["emp-id-1"],
    "priority": "high",
    "dueDate": "2025-02-15"
  }
```

**4. Test Notifications**
```bash
# Fetch unread notifications
curl -X GET http://localhost:8080/api/notifications/unread \
  -H "Authorization: Bearer <jwt>"

# Mark notification as read
curl -X PATCH http://localhost:8080/api/notifications/mark-read/:notificationId \
  -H "Authorization: Bearer <jwt>"
```

**5. Real-Time Testing**
```javascript
// Frontend socket test
const socket = io('http://localhost:8080', {
  auth: { token: 'your-jwt-token' }
});

socket.on('new-notification', (notification) => {
  console.log('Received:', notification);
});
```

---

### Postman Collection Template

**Export these as requests**:
- Create Project
- Get Project Details
- Create Task
- Update Task Status
- Create SubTask
- Update SubTask Status
- Get Notifications
- Upload File to Project
- Add Comment

---

## Conclusion

This Project Management System provides a **robust, scalable foundation** for team collaboration and project tracking. The real-time notification system ensures teams stay informed, while the hierarchical task management provides clear project structure.

### Key Strengths
✅ Real-time notifications (socket.io + email)  
✅ Hierarchical task structure (Project → Task → SubTask)  
✅ Automatic progress calculation  
✅ File management with Cloudinary  
✅ Role-based access control  
✅ Team collaboration features  

### Recommended Next Steps
1. Implement input validation (Joi)
2. Add access control middleware
3. Fix missing notifications & uploadedBy tracking
4. Add rate limiting
5. Implement timesheet & analytics features

---

**Document Maintained By**: Development Team  
**Last Review**: November 18, 2025  
**Next Review**: December 18, 2025
