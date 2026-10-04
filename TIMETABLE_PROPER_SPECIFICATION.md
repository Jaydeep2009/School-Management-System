# 📅 Proper Timetable Management System - Specification

**Date**: January 19, 2026  
**Approach**: Option B - Structured Timetable with Personalized Views

---

## Overview

Implement a professional timetable management system where:
- Principal creates ONE master timetable for the school
- System automatically generates personalized views for teachers and students
- Supports clash detection, substitutions, and reporting

---

## Data Model

### Already Exists (from schema):

```sql
-- Master timetable (one per academic year)
CREATE TABLE timetables (
  id TEXT PRIMARY KEY,
  school_id TEXT,
  academic_year_id TEXT,
  name TEXT, -- e.g., "2025-26 Timetable"
  status TEXT, -- 'draft', 'published', 'archived'
  -- Other metadata
);

-- Individual period assignments
CREATE TABLE timetable_entries (
  id TEXT PRIMARY KEY,
  timetable_id TEXT,
  day_of_week INTEGER, -- 1=Monday, 2=Tuesday, ..., 6=Saturday
  period_no INTEGER, -- 1, 2, 3, 4, 5, 6, 7, 8
  classroom_id TEXT,
  subject_id TEXT,
  teacher_id TEXT,
  start_time TEXT, -- "08:00"
  end_time TEXT, -- "08:45"
  room TEXT, -- Optional room number
  -- Timestamps
);
```

### Need to Add:

```sql
-- Period definitions (school-wide timing)
CREATE TABLE period_timings (
  id TEXT PRIMARY KEY,
  school_id TEXT,
  academic_year_id TEXT,
  period_no INTEGER,
  start_time TEXT,
  end_time TEXT,
  label TEXT, -- "Period 1", "Break", "Lunch"
  is_break BOOLEAN DEFAULT FALSE,
  created_at INTEGER,
  updated_at INTEGER
);
```

---

## Features

### 1. Principal Features

#### A. Setup Period Timings (One-time per year)
```
Define school day structure:
- Period 1: 08:00 - 08:45
- Period 2: 08:45 - 09:30
- Break:    09:30 - 09:45
- Period 3: 09:45 - 10:30
...
```

#### B. Create Timetable Entries
```
For each:
- Day (Monday-Saturday)
- Period (1-8, excluding breaks)
- Assign: Classroom + Subject + Teacher

Grid view:
        | Period 1 | Period 2 | Period 3 | ...
--------|----------|----------|----------|----
Monday  | Select   | Select   | Select   |
Tuesday | Select   | Select   | Select   |
...
```

#### C. Clash Detection
- ✅ Teacher teaching two classes at same time
- ✅ Classroom double-booked
- ✅ Teacher not assigned to that subject for that class

#### D. Bulk Import
- Upload CSV/Excel with timetable data
- Validate and import in batch

#### E. Reports
- Teacher workload report (periods per week)
- Subject distribution by classroom
- Free period analysis

### 2. Teacher Features

#### My Timetable View
```
Shows only their teaching slots:

Monday:
  Period 1 (08:00-08:45): Maths - Class 10-A - Room 201
  Period 3 (09:45-10:30): Maths - Class 10-B - Room 202
  
Tuesday:
  Period 2 (08:45-09:30): Maths - Class 11-A - Room 301
  ...
```

**Features**:
- Weekly calendar view
- Daily view
- Print/Download as PDF
- See free periods

### 3. Student Features

#### My Class Timetable
```
Shows their classroom's complete schedule:

Class 10-A Timetable:

Monday:
  Period 1 (08:00-08:45): Maths (Mr. Smith)
  Period 2 (08:45-09:30): English (Mrs. Johnson)
  Break    (09:30-09:45)
  Period 3 (09:45-10:30): Science (Mr. Davis)
  ...
```

**Features**:
- Weekly view
- Daily view
- Print/Download as PDF
- See next class notification

### 4. Class Teacher Features
- See their teaching schedule
- PLUS: See their class's complete timetable

---

## User Interface

### Principal Pages:

1. **Period Setup** (`/timetable/periods`)
   - List of periods with timing
   - Add/Edit period timing
   - Mark breaks/lunch

2. **Timetable Builder** (`/timetable/builder`)
   - Grid view: Days × Periods
   - Dropdowns: Select Classroom, Subject, Teacher
   - Clash warnings in real-time
   - Save progress (draft mode)
   - Publish when complete

3. **Timetable List** (`/timetable`)
   - View all timetables (by year)
   - Create new, edit, publish, archive

### Teacher Pages:

1. **My Timetable** (`/teacher/timetable`)
   - Weekly calendar view
   - Filtered to show only their classes
   - Today's schedule highlighted

### Student Pages:

1. **Class Timetable** (`/student/timetable`)
   - Weekly calendar view
   - Shows all subjects for their class
   - Current/next period highlighted

---

## API Endpoints

### Principal:
```
GET    /period-timings           - List period timings
POST   /period-timings           - Create period timing
PATCH  /period-timings/:id       - Update period timing
DELETE /period-timings/:id       - Delete period timing

GET    /timetables               - List timetables
POST   /timetables               - Create timetable
GET    /timetables/:id           - Get timetable details
PATCH  /timetables/:id           - Update timetable
POST   /timetables/:id/publish   - Publish timetable
POST   /timetables/:id/archive   - Archive timetable

GET    /timetables/:id/entries   - Get all entries
POST   /timetables/:id/entries   - Create entry
PATCH  /timetable-entries/:id    - Update entry
DELETE /timetable-entries/:id    - Delete entry
POST   /timetables/:id/validate  - Check for clashes

POST   /timetables/import        - Bulk import from CSV
```

### Teacher:
```
GET /teachers/me/timetable        - Get my teaching schedule
GET /teachers/me/timetable/today  - Today's schedule
```

### Student:
```
GET /students/me/timetable        - Get my class timetable
GET /students/me/timetable/today  - Today's schedule
```

---

## Implementation Plan

### Phase 1: Database & Backend ✅ (Mostly done)
- ✅ Schema already exists
- ⏳ Add period_timings table
- ⏳ Create API routes
- ⏳ Add validation logic (clash detection)

### Phase 2: Principal UI
- ⏳ Period setup page
- ⏳ Timetable builder (grid interface)
- ⏳ Validation and clash warnings

### Phase 3: Teacher & Student UI
- ⏳ Teacher: My Timetable page
- ⏳ Student: Class Timetable page
- ⏳ Calendar components

### Phase 4: Advanced Features (Future)
- CSV import/export
- PDF generation
- Substitution management
- Reports and analytics

---

## Validation Rules

1. **No teacher double-booking**: Teacher cannot be in two places at once
2. **No classroom double-booking**: Classroom can only host one class per period
3. **Valid teacher-subject assignment**: Teacher must be assigned to teach that subject in that classroom
4. **No gaps in timetable**: Every classroom should have entries for all periods
5. **Published timetable immutable**: Once published, create new version for changes

---

## Estimated Effort

- **Database setup**: 30 minutes
- **Backend API**: 3-4 hours
- **Principal UI**: 6-8 hours
- **Teacher/Student UI**: 4-6 hours
- **Testing & Refinement**: 2-3 hours

**Total**: ~20-25 hours of development

---

## Decision Needed

This is a significant feature. Should we:

**Option 1**: Build full system now (20-25 hours)
**Option 2**: Build MVP first (Principal builder + Teacher/Student view only, ~10 hours)
**Option 3**: Keep simple image upload for now, build this later

Which would you prefer? Given that you have bugs to fix, would you like me to:
- Start building this now?
- Or finish bug fixing first, then tackle timetables?

Let me know and I'll proceed! 🚀
