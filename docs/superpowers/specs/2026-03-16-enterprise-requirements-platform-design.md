# Enterprise Requirements Platform - Design Spec

## Overview

A web-based system for gathering high-level requirements and project scope, including non-functional requirements with measurable targets. The system supports multiple users and organizations with project sharing. Captured requirements can generate AI-structured prompts, requirements documents, project briefs, and technical specs.

**URL:** enterprise.coria.app
**Deployment:** Coolify (Docker) + Cloudflare DNS

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Auth:** NextAuth.js (email/password with verification)
- **Styling:** Tailwind CSS
- **AI:** Claude API (server-side)
- **Export:** Markdown, PDF, Word (.docx via `docx` npm package)
- **Deployment:** Docker container on Coolify, single PostgreSQL database

## Data Model

### Users & Organizations

**User**
- id (UUID, PK)
- email (unique)
- passwordHash
- name
- emailVerified (boolean)
- createdAt
- updatedAt

**Organization**
- id (UUID, PK)
- name
- slug (unique)
- createdAt
- updatedAt

**OrgMembership**
- id (UUID, PK)
- userId (FK -> User)
- orgId (FK -> Organization)
- role (enum: owner, admin, member)
- createdAt

Constraints: unique(userId, orgId). A user can belong to multiple orgs.

### Projects

**Project**
- id (UUID, PK)
- orgId (FK -> Organization)
- name
- description
- status (enum: draft, active, archived)
- createdById (FK -> User)
- createdAt
- updatedAt

**ProjectMeta**
- id (UUID, PK)
- projectId (FK -> Project, unique)
- businessContext (text)
- visionStatement (text)
- targetUsers (text)
- technicalConstraints (text)
- timeline (text)
- stakeholders (text)
- glossary (text)

**Objective**
- id (UUID, PK)
- projectId (FK -> Project)
- title
- successCriteria (text)
- sortOrder (int)

**UserStory**
- id (UUID, PK)
- projectId (FK -> Project)
- role (text)
- capability (text)
- benefit (text)
- priority (enum: must, should, could, wont)
- sortOrder (int)

### Requirements

**RequirementCategory**
- id (UUID, PK)
- projectId (FK -> Project)
- type (enum: non_functional, constraint, assumption, dependency)
- name
- sortOrder (int)

**Requirement**
- id (UUID, PK)
- categoryId (FK -> RequirementCategory)
- title
- description (text)
- priority (enum: must, should, could, wont)
- sortOrder (int)

**NFRMetric**
- id (UUID, PK)
- requirementId (FK -> Requirement)
- metricName
- targetValue
- unit

### Wizard State

**ProjectWizardState**
- id (UUID, PK)
- projectId (FK -> Project, unique)
- currentStep (int)
- completedSteps (JSON array)
- lastUpdatedAt

### Generated Outputs

**GeneratedOutput**
- id (UUID, PK)
- projectId (FK -> Project)
- outputType (enum: ai_prompt, requirements_doc, project_brief, technical_spec)
- content (text)
- generatedAt
- generatedById (FK -> User)

## Application Architecture

### Route Structure

```
/app/(auth)/
  login
  register
  verify-email
  forgot-password
  reset-password

/app/(dashboard)/
  dashboard                    -- recent projects overview
  org/[slug]/
    projects                   -- project list
    members                    -- manage org members
    settings                   -- org settings
  project/[id]/
    wizard                     -- guided requirements wizard
    requirements               -- freeform requirements editor
    meta                       -- project metadata
    generate                   -- output generation
    outputs                    -- history of generated outputs
    settings                   -- project settings
```

### Key Architectural Decisions

- **Server Components by default.** Client components only where interactivity is needed (forms, drag-and-drop, wizard flow).
- **Server Actions for mutations.** Creating/updating requirements, generating outputs. No separate API routes for internal operations.
- **Middleware for auth.** Redirect unauthenticated users, verify org membership on org/project routes.
- **Claude API calls server-side** in Server Actions. The API key never reaches the client.

## UI Layout

### Rail + Sidebar (Slack-style)

Three-tier layout:

1. **Icon rail (far left, ~56px):** Org switcher. Each org shown as an icon/initials badge. Click to switch active org.
2. **Sidebar (~220px):** Shows projects for the active org, plus org-level navigation (Members, Settings). Active project highlighted.
3. **Main content area:** Tabbed sub-navigation (Wizard, Requirements, Meta, Generate, Outputs, Settings) with content below.

### Wizard Flow (Side Stepper)

Vertical step list on the left side of the content area, content on the right. Steps:

1. **Project Metadata** -- business context, target users, stakeholders, timeline
2. **Vision Statement** -- single clear statement of what the project achieves
3. **5 Key Objectives** -- measurable outcomes with success criteria
4. **Top 10 User Stories** -- "As a [role], I want [capability], so that [benefit]" with priority
5. **Non-Functional Requirements** -- categories with metric prompts (metric name, target value, unit)
6. **Constraints, Assumptions, Dependencies** -- categorized items
7. **Review & Finalize** -- summary of all captured requirements, confirm to exit wizard

Completed steps show a checkmark. Users can jump back to any completed step. After finalizing, the project enters freeform editing mode.

### Freeform Editor (Post-Wizard)

- **Tabbed sections:** Vision, Objectives, User Stories, NFRs, Constraints
- **Inline editing:** Click any item to edit directly
- **Add/remove:** Users can exceed wizard limits (more than 5 objectives, more than 10 stories)
- **Drag-and-drop reordering** within each section
- **MoSCoW priority tagging** on user stories and requirements (must/should/could/won't)
- **Re-enter wizard:** Option to go back through the guided flow
- **Project Meta tab:** Business context, stakeholders, timeline, glossary

## Authentication & Authorization

### Auth Flow

- Register with email and password, receive verification email
- Login with email/password (verified accounts only)
- Forgot password / reset password via email link
- Sessions managed via NextAuth.js with JWT tokens

### Post-Registration

- First-time users create or join an organization after email verification

### Organization Roles

| Role | Manage Members | Create Projects | Edit Projects | Archive/Delete Projects | Org Settings |
|------|---------------|----------------|--------------|------------------------|-------------|
| Owner | Yes | Yes | Yes | Yes | Yes |
| Admin | Yes | Yes | Yes | Yes | No |
| Member | No | Yes | Yes | No | No |

### Project Permissions

- All org members can view all projects in their org
- Any member can create a project (creator becomes project owner)
- Project owners and org admins can archive/delete projects

## Prompt/Document Generation

### Flow

1. **Choose output type:** AI coding prompt, requirements document, project brief, or technical spec
2. **Preview:** System calls Claude API server-side, streams result to a preview pane
3. **Edit:** User can tweak generated output inline before saving
4. **Save/Export:** Save to output history, copy to clipboard, or download as Markdown, PDF, or Word (.docx)

### AI Integration

The system passes the full project context to Claude API:
- Project metadata (business context, target users, stakeholders, timeline)
- Vision statement
- Objectives with success criteria
- User stories with priorities
- Non-functional requirements with measurable metrics
- Constraints, assumptions, dependencies

Claude receives structured instructions to produce the chosen output type. The system handles prompt engineering -- users just pick what they want generated.

## Infrastructure

### Coolify Deployment

- Single Docker container for the Next.js application
- PostgreSQL database managed alongside the app on Coolify
- Environment variables for database URL, NextAuth secret, Claude API key, email service credentials

### Cloudflare DNS

- Domain: enterprise.coria.app
- HTTP record pointing to Coolify (Cloudflare tunnel handles HTTPS)

### Email Service

- Transactional email for verification and password reset
- Provider TBD (Resend, SendGrid, or similar) -- configured via environment variables
