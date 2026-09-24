/**
 * Integrity checks for invariants the database cannot express as a single
 * constraint (they span several rows or tables).
 *
 * Each query returns the ROWS THAT VIOLATE the rule. An empty result means
 * healthy. Use them three ways:
 *   1. In tests, after seeding data.
 *   2. In the activation checklist (year rollover).
 *   3. In a nightly Cron Trigger that logs/alerts on any non-empty result.
 *
 * The SERVICE LAYER must still reject these writes up front; these queries
 * are the safety net that proves the service did its job.
 */
export const INTEGRITY_CHECKS: Record<string, string> = {
  // Promotion: the target class must be in the batch's target year and school.
  promotion_target_wrong_year: `
    SELECT pi.id AS item_id
    FROM promotion_items pi
    JOIN promotion_batches pb ON pb.id = pi.promotion_batch_id
    JOIN classrooms c         ON c.id = pi.target_classroom_id
    WHERE c.academic_year_id <> pb.to_academic_year_id
       OR c.school_id        <> pb.school_id`,

  // Promotion: the source enrollment must be in the batch's source class.
  promotion_source_wrong_class: `
    SELECT pi.id AS item_id
    FROM promotion_items pi
    JOIN promotion_batches pb ON pb.id = pi.promotion_batch_id
    JOIN enrollments e        ON e.id = pi.source_enrollment_id
    WHERE e.classroom_id <> pb.from_classroom_id`,

  // Attendance: entry's enrollment must be in the session's classroom.
  attendance_entry_wrong_classroom: `
    SELECT ae.session_id, ae.student_id
    FROM attendance_entries ae
    JOIN attendance_sessions s ON s.id = ae.session_id
    JOIN enrollments e         ON e.id = ae.enrollment_id
    WHERE e.classroom_id <> s.classroom_id`,

  // Attendance: an entry may exist only while the student was enrolled.
  attendance_entry_outside_enrollment: `
    SELECT ae.session_id, ae.student_id
    FROM attendance_entries ae
    JOIN attendance_sessions s ON s.id = ae.session_id
    JOIN enrollments e         ON e.id = ae.enrollment_id
    WHERE s.session_date < e.joined_on
       OR (e.left_on IS NOT NULL AND s.session_date > e.left_on)`,

  // Marks: enrollment must be in the assessment's classroom.
  marks_wrong_classroom: `
    SELECT m.assessment_id, m.student_id
    FROM marks m
    JOIN assessments a ON a.id = m.assessment_id
    JOIN enrollments e ON e.id = m.enrollment_id
    WHERE e.classroom_id <> a.classroom_id`,

  // Marks: cannot exceed the assessment's maximum.
  marks_over_max: `
    SELECT m.assessment_id, m.student_id
    FROM marks m
    JOIN assessments a ON a.id = m.assessment_id
    WHERE m.marks_obtained > a.max_marks`,

  // A live 'active' enrollment must belong to the current academic year.
  active_enrollment_in_non_current_year: `
    SELECT e.id AS enrollment_id
    FROM enrollments e
    JOIN academic_years y ON y.id = e.academic_year_id
    WHERE e.status = 'active' AND y.status <> 'current'`,

  // A 'planned' enrollment must belong to an upcoming year.
  planned_enrollment_in_started_year: `
    SELECT e.id AS enrollment_id
    FROM enrollments e
    JOIN academic_years y ON y.id = e.academic_year_id
    WHERE e.status = 'planned' AND y.status <> 'upcoming'`,

  // Withdrawal must be one transaction: no live login or class left behind.
  withdrawn_student_still_live: `
    SELECT sp.user_id AS student_id
    FROM student_profiles sp
    JOIN users u ON u.id = sp.user_id
    WHERE sp.status = 'withdrawn'
      AND (u.status = 'active'
           OR EXISTS (SELECT 1 FROM enrollments e
                      WHERE e.student_id = sp.user_id
                        AND e.status IN ('active', 'planned')))`,
};

/**
 * Activation checklist (parameterised): active students of the year being
 * closed who have NO promotion outcome yet. Must be empty before activation.
 * Bind: :old_year
 */
export const ACTIVATION_PRECHECKS: Record<string, string> = {
  active_without_outcome: `
    SELECT e.id AS enrollment_id, e.student_id
    FROM enrollments e
    WHERE e.academic_year_id = :old_year
      AND e.status = 'active'
      AND e.outcome IS NULL`,

  // every promote/retain student needs a planned enrollment in the new year
  outcome_without_planned_enrollment: `
    SELECT e.id AS enrollment_id, e.student_id
    FROM enrollments e
    WHERE e.academic_year_id = :old_year
      AND e.status = 'active'
      AND e.outcome IN ('promoted', 'retained')
      AND NOT EXISTS (SELECT 1 FROM enrollments n WHERE n.from_enrollment_id = e.id AND n.status = 'planned')`,
};

/**
 * Year activation: set-based statements, run in ONE db.batch() (a transaction),
 * in this order. Independent of student count and D1's bound-parameter limit.
 * Bind: :school, :old_year, :new_year, :now, :today, :audit_id, :actor
 *
 * Carry-forward of unpaid fees is a service step (chunked inserts), not here.
 */
export const ACTIVATION_STATEMENTS: string[] = [
  // 1. leavers: end their enrollment as 'left'
  `UPDATE enrollments SET status = 'left', left_on = :today, updated_at = :now
    WHERE school_id = :school AND academic_year_id = :old_year
      AND status = 'active' AND outcome = 'left'`,

  // 2. everyone else in the old year: completed, dated at the year's end
  `UPDATE enrollments
      SET status = 'completed',
          left_on = (SELECT ends_on FROM academic_years WHERE id = :old_year),
          updated_at = :now
    WHERE school_id = :school AND academic_year_id = :old_year AND status = 'active'`,

  // 3. planned enrollments in the new year go live
  `UPDATE enrollments SET status = 'active', updated_at = :now
    WHERE school_id = :school AND academic_year_id = :new_year AND status = 'planned'`,

  // 4. leavers: profile withdrawn, login disabled, sessions revoked
  `UPDATE student_profiles SET status = 'withdrawn', updated_at = :now
    WHERE school_id = :school AND user_id IN
      (SELECT student_id FROM enrollments
        WHERE school_id = :school AND academic_year_id = :old_year AND outcome = 'left')`,
  `UPDATE users SET status = 'disabled', token_version = token_version + 1, updated_at = :now
    WHERE school_id = :school AND id IN
      (SELECT student_id FROM enrollments
        WHERE school_id = :school AND academic_year_id = :old_year AND outcome = 'left')`,
  `UPDATE sessions SET revoked_at = :now
    WHERE revoked_at IS NULL AND user_id IN
      (SELECT student_id FROM enrollments
        WHERE school_id = :school AND academic_year_id = :old_year AND outcome = 'left')`,

  // 5. graduates: profile inactive (login policy is a school decision)
  `UPDATE student_profiles SET status = 'inactive', updated_at = :now
    WHERE school_id = :school AND user_id IN
      (SELECT student_id FROM enrollments
        WHERE school_id = :school AND academic_year_id = :old_year AND outcome = 'graduated')`,

  // 6. years: close the old one FIRST (only one 'current' allowed), then open the new one
  `UPDATE academic_years SET status = 'closed', updated_at = :now
    WHERE id = :old_year AND school_id = :school AND status = 'current'`,
  `UPDATE academic_years SET status = 'current', updated_at = :now
    WHERE id = :new_year AND school_id = :school AND status = 'upcoming'`,

  // 7. promotion batches for the new year are now applied
  `UPDATE promotion_batches SET status = 'applied', applied_at = :now
    WHERE school_id = :school AND to_academic_year_id = :new_year AND status = 'planned'`,

  // 8. audit
  `INSERT INTO audit_log (id, school_id, actor_id, actor_role, action, entity, entity_id, after, at)
   VALUES (:audit_id, :school, :actor, 'principal', 'ACADEMIC_YEAR_ACTIVATED', 'academic_years', :new_year,
           json_object('from', :old_year, 'to', :new_year), :now)`,
];

/**
 * Import commit claim. Run as ONE statement; proceed only if exactly one row
 * changed. Rejects: expired previews, already-claimed/committed previews,
 * previews of another school, previews created by another user.
 * Bind: :id, :school, :actor, :now
 */
export const IMPORT_CLAIM_SQL = `
  UPDATE import_jobs SET status = 'committing'
   WHERE id = :id AND school_id = :school AND actor_id = :actor
     AND status = 'previewed' AND expires_at > :now`;
