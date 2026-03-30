Design a modern, clean, enterprise-level web application UI for a "Sanitary and Epidemiology Laboratory Management System".

The system is role-based and includes the following user roles:
- Cashier (KASSA)
- Lab Technician (Laborant)
- Laboratory Director
- Company Director
- Admin

Use a professional, minimal, clean design style similar to modern SaaS dashboards (like Stripe, Notion, or AdminLTE but more modern). Use soft shadows, rounded corners, clean typography, and a balanced layout. Prefer a light theme with optional soft blue/green medical color accents.

-----------------------------------
GLOBAL LAYOUT
-----------------------------------
- Left sidebar navigation (collapsible)
- Top navbar with notifications, user profile, and role indicator
- Main content area with cards, tables, charts

-----------------------------------
PAGES & FEATURES
-----------------------------------

1. LOGIN PAGE
- Clean centered login form
- Logo + system name
- Username & password fields
- "Remember me" checkbox
- Modern medical style illustration

-----------------------------------

2. CASHIER DASHBOARD
- Summary cards:
  - Total patients today
  - Total orders
  - Total income
  - Pending analyses
- Charts:
  - Daily/weekly/monthly income graph
  - Orders statistics
- Patient registration form:
  - Full name, phone, ID, etc.
- Order creation UI:
  - Select analysis types (multi-select)
  - Order status default: "Pending"
- Orders table:
  - Patient name
  - Analysis type
  - Status (Pending / In Progress / Completed)
  - Date

-----------------------------------

3. LAB TECHNICIAN (LABORANT) DASHBOARD
- Cards:
  - Total assigned analyses
  - In-progress analyses
  - Completed analyses
- Charts:
  - Daily / Weekly / Monthly / Yearly analysis count
- Analysis list table:
  - Patient
  - Analysis type
  - Status
- Analysis detail page:
  - Input fields for results
  - Save result button
  - Status changes automatically to "In Progress"

-----------------------------------

4. LABORATORY DIRECTOR DASHBOARD
- Focus on approval workflow
- Table of analyses:
  - Filter by status
- Action:
  - Approve results (changes status to "Completed")
- Statistics:
  - All analysis counts
  - Approval rates
  - Performance charts

-----------------------------------

5. COMPANY DIRECTOR DASHBOARD
- High-level analytics only
- Big charts and infographics:
  - Total income
  - Total analyses
  - Growth trends
- No editing, only viewing

-----------------------------------

6. ADMIN PANEL
- User management:
  - Create / edit / delete users
  - Assign roles
- System settings:
  - Manage analysis types
  - Manage laboratories
- Table-heavy interface with filters and actions

-----------------------------------

STATUS FLOW (IMPORTANT UX)
-----------------------------------
Visual status badges:
- Pending (gray)
- In Progress (blue)
- Completed (green)

Show status transitions clearly in UI:
- Cashier creates order → Pending
- Lab Technician enters result → In Progress
- Laboratory Director approves → Completed

-----------------------------------

DESIGN STYLE
-----------------------------------
- Clean SaaS dashboard UI
- Soft medical colors (blue, green, white)
- Rounded cards (8–12px radius)
- Subtle shadows
- Modern font (Inter / Roboto)
- Use icons for actions (edit, approve, view)
- Responsive layout

-----------------------------------

EXTRA UX DETAILS
-----------------------------------
- Use filters, search, pagination in tables
- Use modals for create/edit actions
- Use clear call-to-action buttons
- Use data visualization (charts, graphs)

Generate all screens with consistent design system and reusable components.