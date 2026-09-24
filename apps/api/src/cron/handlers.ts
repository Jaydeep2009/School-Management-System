/**
 * Cron Job Handlers
 * 
 * Scheduled background jobs for the SMS system
 */

/**
 * Birthday Digest Cron - Daily at 6:00 AM
 * Compiles list of students with birthdays today
 */
export async function birthdayDigestCron(db: D1Database, env: any): Promise<void> {
  console.log('[CRON] Running birthday digest...');
  
  try {
    const today = new Date();
    const monthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Find students with birthdays today
    const students = await db
      .prepare(`
        SELECT 
          sp.student_code,
          sp.first_name,
          sp.middle_name,
          sp.last_name,
          sp.date_of_birth,
          s.name as school_name
        FROM student_profiles sp
        JOIN schools s ON sp.school_id = s.id
        WHERE sp.dob_md = ? AND sp.status = 'active'
        ORDER BY s.name, sp.first_name
      `)
      .bind(monthDay)
      .all();

    console.log(`[CRON] Found ${students.results?.length || 0} birthdays today`);

    // In a real implementation, this would send notifications/emails
    // For now, we just log the count
    if (students.results && students.results.length > 0) {
      for (const student of students.results) {
        const fullName = [student.first_name, student.middle_name, student.last_name]
          .filter(Boolean)
          .join(' ');
        console.log(`  - ${fullName} (${student.student_code}) at ${student.school_name}`);
      }
    }
  } catch (error) {
    console.error('[CRON] Birthday digest failed:', error);
  }
}

/**
 * Attendance Statistics Cron - Daily at 1:00 AM
 * Aggregates attendance data for reporting
 */
export async function attendanceStatsCron(db: D1Database, env: any): Promise<void> {
  console.log('[CRON] Running attendance statistics...');
  
  try {
    // Get yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    // Aggregate attendance by school
    const stats = await db
      .prepare(`
        SELECT 
          s.name as school_name,
          COUNT(DISTINCT ase.session_id) as total_sessions,
          COUNT(CASE WHEN ae.status = 'present' THEN 1 END) as present_count,
          COUNT(CASE WHEN ae.status = 'absent' THEN 1 END) as absent_count,
          COUNT(*) as total_entries
        FROM attendance_sessions ase
        JOIN schools s ON ase.school_id = s.id
        LEFT JOIN attendance_entries ae ON ase.id = ae.session_id
        WHERE ase.session_date = ?
        GROUP BY ase.school_id, s.name
      `)
      .bind(dateStr)
      .all();

    console.log(`[CRON] Processed attendance stats for ${stats.results?.length || 0} school(s)`);

    if (stats.results && stats.results.length > 0) {
      for (const stat of stats.results) {
        const totalEntries = Number(stat.total_entries) || 0;
        const presentCount = Number(stat.present_count) || 0;
        const presentPct = totalEntries > 0 
          ? ((presentCount / totalEntries) * 100).toFixed(1)
          : '0.0';
        console.log(`  - ${stat.school_name}: ${presentCount}/${totalEntries} present (${presentPct}%) in ${stat.total_sessions} sessions`);
      }
    }

    // In a real implementation, this would:
    // 1. Store aggregated stats in a summary table
    // 2. Send daily attendance reports to principals
    // 3. Flag attendance anomalies (very low attendance)
  } catch (error) {
    console.error('[CRON] Attendance stats failed:', error);
  }
}

/**
 * Marks Statistics Cron - Daily at 2:00 AM
 * Aggregates marks data for performance tracking
 */
export async function marksStatsCron(db: D1Database, env: any): Promise<void> {
  console.log('[CRON] Running marks statistics...');
  
  try {
    // Get assessments from the last 7 days
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

    const stats = await db
      .prepare(`
        SELECT 
          s.name as school_name,
          sub.name as subject_name,
          a.name as assessment_name,
          COUNT(*) as total_entries,
          COUNT(CASE WHEN m.status = 'graded' THEN 1 END) as graded_count,
          COUNT(CASE WHEN m.status = 'absent' THEN 1 END) as absent_count,
          COUNT(CASE WHEN m.status = 'exempt' THEN 1 END) as exempt_count,
          AVG(CASE WHEN m.status = 'graded' THEN m.marks_obtained END) as avg_marks,
          a.max_marks
        FROM assessments a
        JOIN schools s ON a.school_id = s.id
        JOIN subjects sub ON a.subject_id = sub.id
        LEFT JOIN marks m ON a.id = m.assessment_id
        WHERE a.is_published = 1 AND a.created_at > ?
        GROUP BY a.id, s.name, sub.name, a.name, a.max_marks
        HAVING COUNT(*) > 0
      `)
      .bind(sevenDaysAgo)
      .all();

    console.log(`[CRON] Processed marks stats for ${stats.results?.length || 0} assessment(s)`);

    if (stats.results && stats.results.length > 0) {
      for (const stat of stats.results) {
        const gradedCount = Number(stat.graded_count) || 0;
        if (gradedCount > 0) {
          const avgMarks = Number(stat.avg_marks) || 0;
          const maxMarks = Number(stat.max_marks) || 1;
          const avgPct = ((avgMarks / maxMarks) * 100).toFixed(1);
          console.log(`  - ${stat.school_name} | ${stat.subject_name} | ${stat.assessment_name}: avg ${avgMarks}/${maxMarks} (${avgPct}%)`);
        }
      }
    }

    // In a real implementation, this would:
    // 1. Store aggregated stats in a summary table
    // 2. Generate performance reports by classroom/subject
    // 3. Identify at-risk students (low marks across multiple assessments)
  } catch (error) {
    console.error('[CRON] Marks stats failed:', error);
  }
}

/**
 * Fee Reminders Cron - Daily at 8:00 AM
 * Identifies overdue fees and sends reminders
 */
export async function feeRemindersCron(db: D1Database, env: any): Promise<void> {
  console.log('[CRON] Running fee reminders...');
  
  try {
    const today = new Date().toISOString().split('T')[0];

    // Find students with overdue fees
    const overdueCharges = await db
      .prepare(`
        SELECT 
          s.name as school_name,
          sp.student_code,
          sp.first_name,
          sp.middle_name,
          sp.last_name,
          sp.parent_phone,
          sp.parent_email,
          fc.title,
          fc.amount_paise,
          fc.due_on,
          fc.id as charge_id,
          (
            SELECT COALESCE(SUM(fp.amount_paise), 0)
            FROM fee_payments fp
            WHERE fp.student_id = fc.student_id 
              AND fp.academic_year_id = fc.academic_year_id
              AND fp.voided_at IS NULL
          ) as total_paid,
          (
            SELECT COALESCE(SUM(fc2.amount_paise), 0)
            FROM fee_charges fc2
            WHERE fc2.student_id = fc.student_id 
              AND fc2.academic_year_id = fc.academic_year_id
              AND fc2.voided_at IS NULL
          ) as total_charged
        FROM fee_charges fc
        JOIN schools s ON fc.school_id = s.id
        JOIN student_profiles sp ON fc.student_id = sp.user_id
        WHERE fc.due_on < ? 
          AND fc.voided_at IS NULL
          AND fc.kind = 'fee'
        ORDER BY s.name, fc.due_on, sp.first_name
      `)
      .bind(today)
      .all();

    if (!overdueCharges.results || overdueCharges.results.length === 0) {
      console.log('[CRON] No overdue fees found');
      return;
    }

    // Group by student and calculate balance
    const studentBalances = new Map<string, any>();

    for (const charge of overdueCharges.results) {
      const key = `${charge.school_name}-${charge.student_code}`;
      
      if (!studentBalances.has(key)) {
        const totalCharged = Number(charge.total_charged) || 0;
        const totalPaid = Number(charge.total_paid) || 0;
        const balance = totalCharged - totalPaid;
        
        if (balance > 0) {
          studentBalances.set(key, {
            school_name: charge.school_name,
            student_code: charge.student_code,
            student_name: [charge.first_name, charge.middle_name, charge.last_name]
              .filter(Boolean)
              .join(' '),
            parent_phone: charge.parent_phone,
            parent_email: charge.parent_email,
            balance_paise: balance,
            overdue_charges: [],
          });
        }
      }

      if (studentBalances.has(key)) {
        studentBalances.get(key).overdue_charges.push({
          title: charge.title,
          amount_paise: charge.amount_paise,
          due_on: charge.due_on,
        });
      }
    }

    console.log(`[CRON] Found ${studentBalances.size} student(s) with overdue fees`);

    // Log overdue fees (in production, would send SMS/email)
    for (const [, student] of studentBalances) {
      const balanceRupees = (student.balance_paise / 100).toFixed(2);
      console.log(`  - ${student.student_name} (${student.student_code}): ₹${balanceRupees} overdue`);
      console.log(`    Contact: ${student.parent_phone || 'N/A'} | ${student.parent_email || 'N/A'}`);
      console.log(`    Charges: ${student.overdue_charges.length} overdue item(s)`);
    }

    // In a real implementation, this would:
    // 1. Send SMS reminders to parent_phone
    // 2. Send email reminders to parent_email
    // 3. Log reminder history to avoid spam
    // 4. Escalate reminders based on days overdue
  } catch (error) {
    console.error('[CRON] Fee reminders failed:', error);
  }
}
