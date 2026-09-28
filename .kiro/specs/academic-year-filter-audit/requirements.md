# Requirements Document: Academic Year Filter Bug Audit

## Introduction

This specification defines the requirements for a comprehensive system-wide audit and fix of academic year filtering bugs in the School Management System. The system has a critical architectural pattern where pages must filter data by the currently selected academic year using the `useAcademicYear` hook. A system-wide scan revealed that some pages correctly implement this pattern while others have critical bugs that cause data leakage across academic years.

The audit scope includes:
- **13 pages** that use the `useAcademicYear` hook
- **1 confirmed bug** (Teachers page)
- **Reference implementations** (Students, Marks, Fees, Attendance, Timetable, Promotions, Assignments, AcademicStructure)

## Glossary

- **Academic_Year_Filter**: The mechanism that restricts database queries to return only records belonging to the currently selected academic year
- **AcademicYear_Hook**: The `useAcademicYear()` React hook that provides `selectedYear` state to components
- **Page_Component**: A React component that renders a full page in the application and manages data fetching
- **API_Filter**: Query parameters passed to backend API endpoints to filter results
- **useEffect_Dependency**: Dependencies array in React useEffect that triggers re-execution when values change
- **Data_Leakage**: Bug where data from multiple academic years is displayed when only the selected year should be shown
- **Null_Year_Handling**: Proper behavior when no academic year is selected (typically showing empty state)
- **Reference_Implementation**: A page that correctly implements the academic year filtering pattern
- **Bug_Pattern**: Specific code pattern that causes the filtering to fail

## Requirements

### Requirement 1: Academic Year Filter Pattern Compliance

**User Story:** As a system administrator, I want all pages that display academic-year-specific data to filter by the selected academic year, so that users only see data relevant to the current year they are working with.

#### Acceptance Criteria

1. WHEN a Page_Component uses the AcademicYear_Hook, THE Page_Component SHALL include `selectedYear?.id` in its useEffect_Dependency array
2. WHEN a Page_Component fetches data from the API, THE Page_Component SHALL pass `academic_year_id: selectedYear.id` in the API_Filter parameters
3. WHEN selectedYear changes, THE Page_Component SHALL re-fetch data with the new academic year filter
4. WHEN selectedYear is null or undefined, THE Page_Component SHALL display an empty state and SHALL NOT attempt API calls with undefined filters
5. THE Page_Component SHALL NOT display data from multiple academic years simultaneously

### Requirement 2: Teachers Page Bug Fix

**User Story:** As a principal, I want the Teachers page to show only teachers for the selected academic year, so that I don't see outdated or future teaching assignments.

#### Acceptance Criteria

1. THE Teachers page SHALL import and use the AcademicYear_Hook
2. WHEN loading teachers, THE Teachers page SHALL filter by `academic_year_id: selectedYear.id`
3. WHEN selectedYear changes, THE Teachers page SHALL reload the teacher list with the new year filter
4. THE Teachers page useEffect SHALL include `selectedYear?.id` in its dependency array
5. WHEN selectedYear is null, THE Teachers page SHALL display an empty state with message "No academic year selected"

### Requirement 3: System-Wide Audit Tooling

**User Story:** As a developer, I want automated tools to audit academic year filtering compliance, so that I can quickly identify pages with bugs and verify fixes.

#### Acceptance Criteria

1. THE Audit_Tool SHALL scan all Page_Components that use the AcademicYear_Hook
2. WHEN scanning a Page_Component, THE Audit_Tool SHALL verify presence of `selectedYear?.id` in useEffect dependencies
3. WHEN scanning API calls, THE Audit_Tool SHALL verify `academic_year_id` is included in filter parameters
4. THE Audit_Tool SHALL generate a compliance report showing passing and failing pages
5. THE Audit_Tool SHALL identify the specific Bug_Pattern for each failing page

### Requirement 4: Reference Implementation Documentation

**User Story:** As a developer, I want clear documentation of the correct implementation pattern, so that I can fix bugs and implement new pages correctly.

#### Acceptance Criteria

1. THE Documentation SHALL include a complete Reference_Implementation example
2. THE Documentation SHALL explain why `selectedYear?.id` must be in useEffect dependencies
3. THE Documentation SHALL show the correct API_Filter parameter structure
4. THE Documentation SHALL explain Null_Year_Handling best practices
5. THE Documentation SHALL list all pages that currently implement the pattern correctly

### Requirement 5: Null Academic Year Handling

**User Story:** As a user, I want clear feedback when no academic year is selected, so that I understand why pages are empty and what action to take.

#### Acceptance Criteria

1. WHEN selectedYear is null, THE Page_Component SHALL display an empty state component
2. THE empty state SHALL include an icon, heading, and descriptive message
3. THE empty state message SHALL instruct the user to "Select an academic year from the dropdown above"
4. THE Page_Component SHALL NOT make API calls when selectedYear is null
5. WHEN selectedYear becomes non-null, THE Page_Component SHALL immediately fetch and display data

### Requirement 6: Audit Report Generation

**User Story:** As a project manager, I want a comprehensive audit report showing all pages and their compliance status, so that I can track progress on fixing bugs.

#### Acceptance Criteria

1. THE Audit_Report SHALL list all pages that use the AcademicYear_Hook
2. FOR EACH page, THE Audit_Report SHALL indicate pass/fail status for each compliance criterion
3. THE Audit_Report SHALL categorize pages as "Compliant", "Bug Found", or "Needs Verification"
4. THE Audit_Report SHALL include code snippets showing the specific bug location
5. THE Audit_Report SHALL provide fix recommendations for each failing page

### Requirement 7: Testing Strategy for Academic Year Filtering

**User Story:** As a QA engineer, I want automated tests that verify academic year filtering, so that I can prevent regression bugs.

#### Acceptance Criteria

1. THE Test_Suite SHALL include unit tests for each Page_Component's filtering logic
2. WHEN running tests, THE Test_Suite SHALL mock the AcademicYear_Hook with different selectedYear values
3. THE Test_Suite SHALL verify that API calls include the correct `academic_year_id` parameter
4. THE Test_Suite SHALL verify that changing selectedYear triggers a data reload
5. THE Test_Suite SHALL verify Null_Year_Handling behavior

### Requirement 8: Bug Pattern Classification

**User Story:** As a developer, I want to understand the common bug patterns, so that I can avoid making the same mistakes in new code.

#### Acceptance Criteria

1. THE Classification_System SHALL define distinct Bug_Pattern categories
2. Bug_Pattern categories SHALL include: "Missing Hook Import", "Missing API Filter", "Missing useEffect Dependency", "No Null Handling"
3. FOR EACH Bug_Pattern, THE Classification_System SHALL provide a before/after code example
4. FOR EACH Bug_Pattern, THE Classification_System SHALL explain the user-facing impact
5. THE Classification_System SHALL rank Bug_Pattern types by severity (Critical, High, Medium, Low)

### Requirement 9: Fix Validation

**User Story:** As a developer, I want to validate that my bug fixes work correctly, so that I can be confident the issue is resolved.

#### Acceptance Criteria

1. THE Validation_Process SHALL include manual testing steps for each fixed page
2. THE Validation_Process SHALL verify that data updates when academic year changes
3. THE Validation_Process SHALL verify that no data from other years appears
4. THE Validation_Process SHALL verify null year handling
5. THE Validation_Process SHALL include regression testing of working pages

### Requirement 10: Priority Assignment

**User Story:** As a project manager, I want bugs prioritized by severity and user impact, so that I can allocate development resources effectively.

#### Acceptance Criteria

1. THE Priority_System SHALL classify bugs as P0 (Critical), P1 (High), P2 (Medium), or P3 (Low)
2. Data_Leakage bugs SHALL be classified as P0 (Critical)
3. Missing Null_Year_Handling SHALL be classified as P1 (High)
4. Missing useEffect dependencies SHALL be classified based on user impact
5. THE Priority_System SHALL consider page usage frequency in priority calculation

## Summary

This requirements document defines a comprehensive approach to auditing and fixing academic year filtering bugs across the School Management System. The focus is on:

1. **Identifying bugs**: Using the confirmed Teachers page bug as a starting point
2. **Establishing patterns**: Documenting the correct implementation from reference pages
3. **Systematic audit**: Creating tools and processes to find all similar bugs
4. **Fixing and validating**: Providing clear fix guidelines and validation steps
5. **Preventing recurrence**: Testing strategies and developer documentation

The requirements ensure that all pages consistently filter data by academic year, preventing data leakage and providing a reliable user experience.
