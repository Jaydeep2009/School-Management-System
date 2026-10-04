/**
 * Timetable Upload Service
 * Handles Excel/CSV file parsing and timetable creation
 */

import type { TenantContext } from '../auth/auth.types';
import type { Timetable } from './timetable.types';
import * as timetableAuthz from './timetable.authorization';
import { TimetableError } from './timetable.errors';
import { createTimetable, createTimetableEntry, publishTimetable } from './timetable.service';

/**
 * Upload timetable from Excel/CSV file
 */
export async function uploadTimetableFromFile(
  db: D1Database,
  file: File,
  classroomId: string,
  academicYearId: string,
  tenant: TenantContext
): Promise<Timetable> {
  timetableAuthz.ensureCanManageTimetables(tenant);
  
  // Dynamic import xlsx
  const XLSX = await import('xlsx');
  
  // Read file content
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  
  // Get first sheet
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  // Convert to JSON
  const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  if (data.length < 2) {
    throw new TimetableError('File is empty or has no data rows', 'UPLOAD_VALIDATION_FAILED', 400);
  }
  
  // Parse headers (Day, Period 1, Period 2, ...)
  const headers = data[0] as string[];
  if (!headers || headers.length < 2) {
    throw new TimetableError('Invalid file format. Expected headers: Day, Period 1, Period 2...', 'UPLOAD_VALIDATION_FAILED', 400);
  }
  
  // Fetch period timings for this academic year
  const periodTimingsQuery = await db
    .prepare(
      `SELECT id, period_no, start_time, end_time, label, is_break
       FROM period_timings
       WHERE school_id = ? AND academic_year_id = ?
       ORDER BY period_no`
    )
    .bind(tenant.schoolId, academicYearId)
    .all<{
      id: string;
      period_no: number;
      start_time: string;
      end_time: string;
      label: string | null;
      is_break: number;
    }>();
  
  const periodTimings = periodTimingsQuery.results || [];
  
  if (periodTimings.length === 0) {
    throw new TimetableError(
      'No period timings configured. Please set up period timings first.',
      'PERIOD_TIMINGS_NOT_CONFIGURED',
      400
    );
  }
  
  // Extract period columns (skip Day column) and detect breaks from headers
  const periodColumns = headers.slice(1).map((h, idx) => {
    const periodNo = idx + 1;
    const headerLower = String(h).toLowerCase();
    
    // Detect if this column is a break based on header
    const isBreakColumn = headerLower.includes('break') || headerLower.includes('lunch');
    
    let timing = periodTimings.find(t => t.period_no === periodNo);
    
    // If timing exists but is_break status doesn't match header, update it
    if (timing && timing.is_break !== (isBreakColumn ? 1 : 0)) {
      console.log(`[Upload] Period ${periodNo} is_break mismatch. Header: "${h}", DB is_break: ${timing.is_break}. Will update.`);
    }
    
    // If no timing exists for this period, we'll create it later
    if (!timing && isBreakColumn) {
      console.log(`[Upload] Period ${periodNo} is a break ("${h}") but no timing found. Will create.`);
    }
    
    return {
      name: h,
      index: idx + 1,
      periodNo: periodNo,
      timing: timing || null,
      isBreakFromHeader: isBreakColumn
    };
  });
  
  // Update or create period_timings for breaks detected in CSV
  for (const period of periodColumns) {
    // Parse timing from header (e.g., "Break (09:30-09:45)" or "Period 1 (08:00-08:45)")
    const timeMatch = period.name.match(/\((\d{2}:\d{2})-(\d{2}:\d{2})\)/);
    const startTime = timeMatch ? timeMatch[1] : null;
    const endTime = timeMatch ? timeMatch[2] : null;
    
    // Extract label (everything before the time part)
    const label = period.name.split('(')[0].trim();
    
    if (period.timing) {
      // Update existing timing if break status or times changed
      const needsUpdate = 
        period.timing.is_break !== (period.isBreakFromHeader ? 1 : 0) ||
        (startTime && period.timing.start_time !== startTime) ||
        (endTime && period.timing.end_time !== endTime) ||
        (label && period.timing.label !== label);
        
      if (needsUpdate) {
        await db
          .prepare(
            `UPDATE period_timings 
             SET is_break = ?, start_time = ?, end_time = ?, label = ?, updated_at = unixepoch()
             WHERE id = ?`
          )
          .bind(
            period.isBreakFromHeader ? 1 : 0,
            startTime || period.timing.start_time,
            endTime || period.timing.end_time,
            label || period.timing.label,
            period.timing.id
          )
          .run();
        console.log(`[Upload] Updated period_timing for period ${period.periodNo}: is_break=${period.isBreakFromHeader}, label="${label}"`);
      }
    } else if (startTime && endTime) {
      // Create new period_timing
      const id = crypto.randomUUID();
      await db
        .prepare(
          `INSERT INTO period_timings (id, school_id, academic_year_id, period_no, start_time, end_time, label, is_break, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())`
        )
        .bind(
          id,
          tenant.schoolId,
          academicYearId,
          period.periodNo,
          startTime,
          endTime,
          label,
          period.isBreakFromHeader ? 1 : 0
        )
        .run();
      console.log(`[Upload] Created period_timing for period ${period.periodNo}: "${label}" (${startTime}-${endTime}), is_break=${period.isBreakFromHeader}`);
      
      // Update the period column's timing reference
      period.timing = {
        id,
        period_no: period.periodNo,
        start_time: startTime,
        end_time: endTime,
        label,
        is_break: period.isBreakFromHeader ? 1 : 0
      };
    }
  }
  
  // Create timetable record
  const timetableName = `Timetable - ${new Date().toLocaleDateString()}`;
  const timetable = await createTimetable(
    db,
    {
      name: timetableName,
      academic_year_id: academicYearId,
      classroom_id: classroomId
    },
    tenant
  );
  
  console.log(`[Upload] Created new timetable: ${timetable.id}`);
  
  // Find and unpublish old published timetables for this classroom
  const oldTimetables = await db
    .prepare(
      `SELECT id FROM timetables
       WHERE classroom_id = ?
       AND academic_year_id = ?
       AND school_id = ?
       AND status = 'published'
       AND id != ?`
    )
    .bind(classroomId, academicYearId, tenant.schoolId, timetable.id)
    .all<{ id: string }>();
  
  if (oldTimetables.results && oldTimetables.results.length > 0) {
    console.log(`[Upload] Found ${oldTimetables.results.length} old published timetables, archiving them...`);
    for (const oldTimetable of oldTimetables.results) {
      await db
        .prepare(`UPDATE timetables SET status = 'archived', updated_at = unixepoch() WHERE id = ?`)
        .bind(oldTimetable.id)
        .run();
      console.log(`[Upload] Archived old timetable: ${oldTimetable.id}`);
    }
  }
  
  // Parse rows and create entries
  const dayMap: { [key: string]: number } = {
    'monday': 1,
    'tuesday': 2,
    'wednesday': 3,
    'thursday': 4,
    'friday': 5,
    'saturday': 6,
    'sunday': 7
  };
  
  const errors: string[] = [];
  let successCount = 0;
  
  console.log(`[Upload] Processing ${data.length - 1} rows`);
  
  for (let rowIdx = 1; rowIdx < data.length; rowIdx++) {
    const row = data[rowIdx];
    if (!row || row.length < 2) continue;
    
    const dayName = String(row[0]).toLowerCase().trim();
    const dayOfWeek = dayMap[dayName];
    
    console.log(`[Upload] Row ${rowIdx + 1}: Processing day "${dayName}" (day_of_week=${dayOfWeek})`);
    
    if (!dayOfWeek) {
      const error = `Row ${rowIdx + 1}: Invalid day name "${row[0]}"`;
      errors.push(error);
      console.error(`[Upload] ${error}`);
      continue;
    }
    
    // Parse each period
    let dayEntryCount = 0;
    for (const period of periodColumns) {
      const cellValue = row[period.index];
      
      // Skip if no timing configured for this period
      if (!period.timing) {
        continue;
      }
      
      // Skip breaks, empty cells, or free periods
      if (!cellValue || 
          String(cellValue).trim() === '' || 
          String(cellValue).toLowerCase() === 'free' || 
          String(cellValue).toLowerCase() === 'break' ||
          String(cellValue).toLowerCase() === 'lunch' ||
          (period.timing && period.timing.is_break)) {
        continue;
      }
      
      // Parse "Subject (Teacher)" format
      const match = String(cellValue).match(/^(.+?)\s*\((.+?)\)\s*$/);
      if (!match) {
        const error = `Row ${rowIdx + 1}, Period ${period.periodNo}: Invalid format "${cellValue}". Expected: "Subject (Teacher)"`;
        errors.push(error);
        console.error(`[Upload] ${error}`);
        continue;
      }
      
      const subjectName = match[1].trim();
      const teacherName = match[2].trim();
      
      console.log(`[Upload] Row ${rowIdx + 1}, Period ${period.periodNo}: Processing "${subjectName}" with "${teacherName}"`);
      
      try {
        // Find or create subject
        const subject = await findOrCreateSubject(db, subjectName, tenant);
        
        // Store teacher name as text - don't create teacher records
        // Create timetable entry with timing info and teacher name
        await createTimetableEntry(
          db,
          timetable.id,
          {
            day_of_week: dayOfWeek as 1 | 2 | 3 | 4 | 5 | 6 | 7,
            period_no: period.periodNo,
            subject_id: subject.id,
            teacher_id: null,
            teacher_name: teacherName,
            start_time: period.timing.start_time,
            end_time: period.timing.end_time
          },
          tenant
        );
        
        successCount++;
        dayEntryCount++;
        console.log(`[Upload] Row ${rowIdx + 1}, Period ${period.periodNo}: Success (total: ${successCount})`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        const error = `Row ${rowIdx + 1}, Period ${period.periodNo}: ${message}`;
        errors.push(error);
        console.error(`[Upload] ${error}`, err);
      }
    }
    
    console.log(`[Upload] Row ${rowIdx + 1}: Completed with ${dayEntryCount} entries for ${dayName}`);
  }
  
  // Log detailed errors for debugging
  if (errors.length > 0) {
    console.warn(`Timetable upload completed with ${errors.length} errors:`, errors);
    console.warn(`Success count: ${successCount}`);
  }
  
  if (successCount === 0 && errors.length > 0) {
    throw new TimetableError(
      `Upload failed. No entries were created. Errors:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n...and ${errors.length - 5} more errors` : ''}`,
      'UPLOAD_FAILED',
      400
    );
  }
  
  // Auto-publish the timetable
  await publishTimetable(db, timetable.id, tenant);
  
  // Create teaching assignments based on uploaded entries
  await createTeachingAssignmentsFromTimetable(db, timetable.id, classroomId, tenant);
  
  // Return timetable with warnings if partial success
  const result = {
    ...timetable,
    warnings: errors.length > 0 ? errors : undefined
  };
  
  return result as Timetable;
}

/**
 * Find or create subject by name
 */
async function findOrCreateSubject(
  db: D1Database,
  name: string,
  tenant: TenantContext
): Promise<{ id: string; name: string }> {
  // Try to find existing subject (case-insensitive name match)
  let existing = await db
    .prepare(
      `SELECT id, name FROM subjects
       WHERE LOWER(name) = LOWER(?)
       AND school_id = ?
       LIMIT 1`
    )
    .bind(name, tenant.schoolId)
    .first<{ id: string; name: string }>();
  
  if (existing) {
    return existing;
  }
  
  // Generate subject code
  const subjectCode = name.substring(0, 10).toUpperCase().replace(/\s/g, '_');
  
  // Try to find by subject_code (handles "Math" vs "Mathematics" case)
  existing = await db
    .prepare(
      `SELECT id, name FROM subjects
       WHERE subject_code = ?
       AND school_id = ?
       LIMIT 1`
    )
    .bind(subjectCode, tenant.schoolId)
    .first<{ id: string; name: string }>();
  
  if (existing) {
    console.log(`[Upload] Found existing subject by code: "${name}" -> "${existing.name}" (${subjectCode})`);
    return existing;
  }
  
  // Create new subject
  const { ulid } = await import('ulidx');
  const id = ulid();
  
  console.log(`[Upload] Creating new subject: "${name}" with code "${subjectCode}"`);
  
  await db
    .prepare(
      `INSERT INTO subjects (id, school_id, subject_code, name, created_at, updated_at)
       VALUES (?, ?, ?, ?, unixepoch(), unixepoch())`
    )
    .bind(id, tenant.schoolId, subjectCode, name)
    .run();
  
  return { id, name };
}

/**
 * Find or create teacher by name
 */
async function findOrCreateTeacher(
  db: D1Database,
  name: string,
  tenant: TenantContext
): Promise<{ id: string; name: string }> {
  // Clean and normalize the name
  const cleanName = name.trim().replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s*/i, '');
  const nameParts = cleanName.split(' ').filter(p => p.length > 0);
  
  if (nameParts.length === 0) {
    throw new Error(`Invalid teacher name: "${name}"`);
  }
  
  const lastName = nameParts[nameParts.length - 1];
  const firstName = nameParts[0];
  
  // Try multiple matching strategies
  // 1. Try exact full name match (case-insensitive)
  let existing = await db
    .prepare(
      `SELECT u.id, tp.first_name || ' ' || tp.last_name as name
       FROM users u
       INNER JOIN teacher_profiles tp ON u.id = tp.user_id
       WHERE u.school_id = ?
       AND u.role = 'teacher'
       AND LOWER(tp.first_name || ' ' || tp.last_name) = LOWER(?)
       LIMIT 1`
    )
    .bind(tenant.schoolId, cleanName)
    .first<{ id: string; name: string }>();
  
  if (existing) {
    return existing;
  }
  
  // 2. Try last name only match
  existing = await db
    .prepare(
      `SELECT u.id, tp.first_name || ' ' || tp.last_name as name
       FROM users u
       INNER JOIN teacher_profiles tp ON u.id = tp.user_id
       WHERE u.school_id = ?
       AND u.role = 'teacher'
       AND LOWER(tp.last_name) = LOWER(?)
       LIMIT 1`
    )
    .bind(tenant.schoolId, lastName)
    .first<{ id: string; name: string }>();
  
  if (existing) {
    return existing;
  }
  
  // 3. Try first name only match (less reliable, only if name is single word)
  if (nameParts.length === 1) {
    existing = await db
      .prepare(
        `SELECT u.id, tp.first_name || ' ' || tp.last_name as name
         FROM users u
         INNER JOIN teacher_profiles tp ON u.id = tp.user_id
         WHERE u.school_id = ?
         AND u.role = 'teacher'
         AND LOWER(tp.first_name) = LOWER(?)
         LIMIT 1`
      )
      .bind(tenant.schoolId, firstName)
      .first<{ id: string; name: string }>();
    
    if (existing) {
      return existing;
    }
  }
  
  // If no match found, create new teacher
  const { ulid } = await import('ulidx');
  const userId = ulid();
  
  // Get school code for login_id
  const school = await db
    .prepare('SELECT code FROM schools WHERE id = ?')
    .bind(tenant.schoolId)
    .first<{ code: string }>();
  
  if (!school) {
    throw new Error('School not found');
  }
  
  // Get next teacher sequence number
  const lastTeacher = await db
    .prepare(
      `SELECT login_id FROM users 
       WHERE school_id = ? AND role = 'teacher'
       ORDER BY login_id DESC LIMIT 1`
    )
    .bind(tenant.schoolId)
    .first<{ login_id: string }>();
  
  let sequence = 1;
  if (lastTeacher) {
    const parts = lastTeacher.login_id.split('-');
    sequence = parseInt(parts[2] || '0') + 1;
  }
  
  const loginId = `${school.code}-T-${String(sequence).padStart(6, '0')}`;
  const employeeCode = `EMP${Date.now()}`;
  
  // Create user
  await db
    .prepare(
      `INSERT INTO users (
        id, school_id, login_id, role, password_hash, 
        status, must_change_password, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())`
    )
    .bind(
      userId,
      tenant.schoolId,
      loginId,
      'teacher',
      'TEMP_PASSWORD_CHANGE_REQUIRED', // Placeholder - admin should reset
      'active',
      1
    )
    .run();
  
  // Create teacher profile
  await db
    .prepare(
      `INSERT INTO teacher_profiles (
        user_id, school_id, employee_code, first_name, last_name,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())`
    )
    .bind(
      userId,
      tenant.schoolId,
      employeeCode,
      firstName || 'Teacher',
      lastName,
      'active'
    )
    .run();
  
  return { id: userId, name: cleanName };
}

/**
 * Create teaching assignments from timetable entries
 * This ensures teachers can see their timetables
 */
async function createTeachingAssignmentsFromTimetable(
  db: D1Database,
  timetableId: string,
  classroomId: string,
  tenant: TenantContext
): Promise<void> {
  // Get unique teacher-subject combinations from entries
  const entries = await db
    .prepare(
      `SELECT DISTINCT te.teacher_id, te.subject_id
       FROM timetable_entries te
       WHERE te.timetable_id = ?`
    )
    .bind(timetableId)
    .all<{ teacher_id: string; subject_id: string }>();
  
  const { ulid } = await import('ulidx');
  
  for (const entry of entries.results || []) {
    // Check if teaching assignment already exists for this classroom-subject combo
    const existing = await db
      .prepare(
        `SELECT id FROM teaching_assignments
         WHERE classroom_id = ?
         AND subject_id = ?
         AND school_id = ?`
      )
      .bind(classroomId, entry.subject_id, tenant.schoolId)
      .first<{ id: string }>();
    
    if (existing) {
      // Update existing assignment with the current teacher
      await db
        .prepare(
          `UPDATE teaching_assignments
           SET teacher_id = ?, updated_at = unixepoch()
           WHERE id = ?`
        )
        .bind(entry.teacher_id, existing.id)
        .run();
    } else {
      // Create new teaching assignment
      await db
        .prepare(
          `INSERT INTO teaching_assignments (
            id, school_id, teacher_id, classroom_id, subject_id,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, unixepoch(), unixepoch())`
        )
        .bind(
          ulid(),
          tenant.schoolId,
          entry.teacher_id,
          classroomId,
          entry.subject_id
        )
        .run();
    }
  }
}
