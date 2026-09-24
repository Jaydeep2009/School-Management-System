# Student Login Credentials System

## Overview

The School Management System now uses a **predictable password formula** for student accounts, eliminating the need for principals to manually share activation credentials with each student.

## How It Works

### For Students

When a student account is created (either manually or via Excel import), the system automatically generates:

1. **Login ID**: Based on school code and sequence number
   - Format: `{SCHOOL_CODE}-S-{SEQUENCE}`
   - Example: `GPS-S-000001`, `GPS-S-000123`

2. **Temporary Password**: Based on admission number and school code
   - Formula: `{ADMISSION_NUMBER}@{SCHOOL_CODE}`
   - Example: If admission number is `ADM001` and school code is `GPS`, password is `ADM001@GPS`

### First Login Process

1. Student goes to the login page
2. Enters their **Login ID** (provided by school/visible in student list)
3. Enters their **Temporary Password** (using the formula above)
4. System forces password change on first login
5. Student sets their own secure password

### For Teachers & Principals

Teachers and principals continue to use **secure random passwords** for better security:
- Format: `ABCD-EFGH-JKLM-NPQR` (random characters)
- These must be shared individually by the system administrator

## Benefits

✅ **No Manual Distribution**: Students can login immediately using the predictable formula  
✅ **Easy to Communicate**: Principals can announce the formula once to all students  
✅ **Secure**: Students must change password on first login  
✅ **School-Specific**: Each school has a unique code, preventing cross-school access

## Example Scenarios

### Scenario 1: Individual Student Creation

Principal creates a new student:
- Admission Number: `2024001`
- School Code: `GPS`
- Generated Login ID: `GPS-S-000045`
- Temporary Password: `2024001@GPS`

Principal can tell the student:
> "Your login ID is GPS-S-000045. Your password is your admission number followed by @GPS"

### Scenario 2: Bulk Excel Import

Principal imports 50 students via Excel. All students can login immediately using:
- Their login ID (shown in student list)
- Formula: `{THEIR_ADMISSION_NUMBER}@GPS`

Principal announces to all students:
> "Your temporary password is your admission number followed by @GPS. Example: if your admission number is 2024001, your password is 2024001@GPS"

### Scenario 3: Password Reset

If a student forgets their password, principal can reset it:
1. Principal clicks "Reset Password" for the student
2. System resets password back to the formula: `{ADMISSION_NUMBER}@{SCHOOL_CODE}`
3. Student can login again using the same formula
4. Student sets a new password

## Security Considerations

### Why This is Secure

1. **Temporary Only**: Password must be changed on first login
2. **School-Specific**: Each school has a unique code
3. **Admission Number Required**: Attacker would need to know the admission number
4. **Session Security**: All sessions use JWT tokens with expiry
5. **Account Lockout**: Failed login attempts can trigger account lockout (if enabled)

### What Students Should Know

- ⚠️ Change your password immediately after first login
- ⚠️ Don't share your new password with anyone
- ⚠️ Use a strong password (mix of letters, numbers, symbols)
- ⚠️ The temporary password only works until you set your own password

## Password Formula Reference

| User Type | Login ID Format | Password Formula | Example |
|-----------|----------------|------------------|---------|
| Student | `{SCHOOL}-S-{SEQ}` | `{ADMISSION}@{SCHOOL}` | Login: `GPS-S-000001`<br>Pass: `ADM001@GPS` |
| Teacher | `{SCHOOL}-T-{SEQ}` | Random secure | Login: `GPS-T-000001`<br>Pass: `ABCD-EFGH-JKLM-NPQR` |
| Principal | Custom | Random secure | Login: `GPS-PRINCIPAL`<br>Pass: `WXYZ-ABCD-EFGH-JKLM` |

## Frequently Asked Questions

**Q: What if a student forgets their admission number?**  
A: The principal can check the student list in the system to see the admission number.

**Q: Can students use the formula after changing their password?**  
A: No. The formula only works as the temporary password. After setting a new password, students must use their chosen password.

**Q: What if two students have the same admission number?**  
A: The system prevents duplicate admission numbers within a school. Each admission number must be unique.

**Q: Can we change the school code?**  
A: The school code is set when the school is created. Contact the system administrator to change it.

**Q: Is this less secure than random passwords?**  
A: For students, this is acceptable because:
  - Password must be changed immediately
  - It's school-specific
  - It eliminates the manual distribution problem
  - Teachers and principals still use random passwords

## Implementation Notes

### For Developers

The password generation is handled in `apps/api/src/accounts/code-generator.service.ts`:

```typescript
export function generatePredictablePassword(
  identifier: string, // admission_number or employee_code
  schoolCode: string
): string {
  return `${identifier}@${schoolCode}`;
}
```

Used only in `apps/api/src/accounts/student.service.ts` for:
- Creating new students
- Reactivating students  
- Resetting student passwords

Teachers use the existing `generateTemporaryPassword()` function which generates secure random passwords.

### Database

No database changes required. The formula is computed at runtime and the hash is stored in the `activation_hash` field as before.

## Troubleshooting

**Issue**: Student can't login with formula  
**Solution**: 
1. Verify the admission number is correct
2. Check the school code
3. Ensure the student account is active
4. Try resetting the password

**Issue**: Password formula not working after first login  
**Solution**: This is expected. After changing password, students must use their new password, not the formula.

**Issue**: Student entered wrong password too many times  
**Solution**: Principal can reactivate or reset the password for the student.
