# Principal Dashboard Implementation Plan

## Status: IN PROGRESS

This document outlines the complete implementation of the Principal Dashboard based on the provided reference image.

## Dependencies Installed ✅

- `react-router-dom` - Routing
- `lucide-react` - Icons library
- `recharts` - Charts (for attendance donut chart)
- `date-fns` - Date utilities

## Directory Structure Created ✅

```
src/
  components/
    ui/                    - Reusable UI components
    dashboard/             - Dashboard-specific components
  pages/                   - Page components
  services/                - API services
  hooks/                   - Custom React hooks
  types/                   - TypeScript type definitions
  lib/                     - Utility functions
```

## Files Created ✅

1. `types/auth.ts` - Authentication types
2. `types/dashboard.ts` - Dashboard data types
3. `lib/utils.ts` - Utility functions (cn, formatDate, etc.)
4. `services/api.ts` - Centralized API service
5. `components/ui/Card.tsx` - Card component
6. `components/ui/Card.css` - Card styles

## Remaining Implementation

### Core UI Components (Priority 1)
- [ ] Button.tsx
- [ ] Badge.tsx
- [ ] Avatar.tsx
- [ ] Skeleton.tsx
- [ ] EmptyState.tsx
- [ ] ErrorState.tsx

### Layout Components (Priority 1)
- [ ] Sidebar.tsx - Fixed left navigation
- [ ] Header.tsx - Top header with search
- [ ] Layout.tsx - Main layout wrapper

### Dashboard Components (Priority 2)
- [ ] DashboardHeader.tsx - Welcome header
- [ ] StatCard.tsx - KPI cards
- [ ] AttendanceOverview.tsx - Donut chart + stats
- [ ] AssessmentProgress.tsx - Progress bars
- [ ] QuickActions.tsx - Action buttons grid
- [ ] RecentActivity.tsx - Activity feed
- [ ] BirthdayList.tsx - Upcoming birthdays
- [ ] AcademicYearCard.tsx - Current year info

### Services & Hooks (Priority 2)
- [ ] dashboardService.ts - Dashboard data aggregation
- [ ] useAuth.ts - Authentication hook
- [ ] useDashboard.ts - Dashboard data hook

### Pages (Priority 3)
- [ ] PrincipalDashboard.tsx - Main dashboard page
- [ ] Login.tsx - Login page
- [ ] NotFound.tsx - 404 page

### Routing & App Structure (Priority 3)
- [ ] Update App.tsx with routing
- [ ] Create ProtectedRoute component
- [ ] Update main.tsx if needed

### Styling (Priority 4)
- [ ] Global styles update
- [ ] Dashboard-specific styles
- [ ] Responsive breakpoints

## Key Implementation Notes

### API Integration Points

**Backend endpoints that exist:**
- `/health` - Health check ✅
- `/auth/login` - Authentication ✅
- `/auth/logout` - Logout ✅
- `/students` - List students
- `/teachers` - List teachers
- `/classrooms` - List classrooms
- `/subjects` - List subjects
- `/academic-years` - List academic years
- `/birthdays/upcoming` - Upcoming birthdays
- `/attendance/sessions` - Attendance sessions
- `/assessments` - Assessments

**Backend endpoints that DON'T exist yet:**
- `/dashboard/principal` - Aggregated dashboard stats (NEEDED)
- `/audit/recent` - Recent activity feed (NEEDED)

### Data Aggregation Strategy

Since there's no dedicated dashboard endpoint, we have two options:

1. **Client-side aggregation** (Initial approach):
   - Fetch students, teachers, classrooms, subjects separately
   - Aggregate on the frontend
   - Less efficient but doesn't require backend changes

2. **Backend dashboard endpoint** (Recommended for production):
   - Create `GET /dashboard/principal` endpoint
   - Returns all dashboard data in one request
   - More efficient, better performance

### Component Reusability

All dashboard components should be built for reusability:
- StatCard can be used for any metric
- Card components used across all widgets
- Avatar, Badge, Button used everywhere

### Responsive Design Breakpoints

```css
/* Mobile */
@media (max-width: 768px) {
  /* Sidebar collapses */
  /* Cards stack vertically */
  /* Tables become scrollable */
}

/* Tablet */
@media (min-width: 769px) and (max-width: 1024px) {
  /* Sidebar can toggle */
  /* Some cards still wrap */
}

/* Desktop */
@media (min-width: 1025px) {
  /* Full layout as per reference */
}
```

### Color Palette (from reference)

```css
/* Primary */
--color-primary: #2563eb;        /* Blue */
--color-sidebar: #1e293b;        /* Dark navy */

/* Status */
--color-success: #10b981;        /* Green */
--color-danger: #ef4444;         /* Red */
--color-warning: #f59e0b;        /* Orange */

/* Background */
--color-bg-main: #f8fafc;
--color-bg-card: #ffffff;

/* Text */
--color-text-primary: #1a202c;
--color-text-secondary: #4a5568;
--color-text-muted: #718096;

/* Accent colors for widgets */
--color-students: #dbeafe;       /* Light blue */
--color-teachers: #d1fae5;       /* Light green */
--color-classes: #e0e7ff;        /* Light purple */
--color-subjects: #fef3c7;       /* Light yellow */
```

### Mock Data Strategy

For initial development, create a mock data service that returns properly typed data matching the expected API response structure. This allows parallel frontend/backend development.

## Next Steps

1. Complete all UI components
2. Build layout (Sidebar, Header, Layout)
3. Create dashboard components
4. Implement PrincipalDashboard page
5. Set up routing
6. Connect to real APIs
7. Handle loading/error states
8. Test responsiveness
9. Polish and refine

## Testing Checklist

- [ ] All API calls have loading states
- [ ] All API calls have error handling
- [ ] Empty states for zero data
- [ ] Responsive design works on mobile/tablet/desktop
- [ ] TypeScript compiles without errors
- [ ] No hardcoded data in production code
- [ ] Proper authorization checks
- [ ] Logout functionality works
- [ ] Navigation works correctly

## Notes

- The reference image shows "Greenwood Academy" and "Priya Sharma" - these are ONLY visual references
- Product name is "SMS", not "School Management System"
- All user/school data must come from authenticated session
- No fake notifications or unsupported features
- Frontend authorization is for UX only - backend is the security boundary
