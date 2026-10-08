/**
 * Delete School Dialog - Multi-step confirmation
 * 
 * Requires:
 * 1. Understanding of data loss
 * 2. School name confirmation
 * 3. Typing "DELETE" confirmation code
 */

import { useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Button } from '../ui/Button';

interface DeleteSchoolDialogProps {
  schoolId: string;
  schoolName: string;
  schoolCode: string;
  onConfirm: (schoolName: string, confirmationCode: string) => Promise<void>;
  onCancel: () => void;
}

export function DeleteSchoolDialog({
  schoolName,
  schoolCode,
  onConfirm,
  onCancel,
}: DeleteSchoolDialogProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [understood, setUnderstood] = useState(false);
  const [nameConfirmation, setNameConfirmation] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNext = () => {
    if (step === 1 && understood) {
      setStep(2);
    } else if (step === 2 && nameConfirmation === schoolName) {
      setStep(3);
    }
  };

  const handleDelete = async () => {
    if (confirmationCode !== 'DELETE') {
      setError('You must type DELETE exactly as shown');
      return;
    }

    try {
      setIsDeleting(true);
      setError(null);
      await onConfirm(nameConfirmation, confirmationCode);
      // onConfirm will handle success and navigation
    } catch (err) {
      console.error('[DeleteSchoolDialog] Error:', err);
      let errorMessage = 'Failed to delete school';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null && 'error' in err) {
        errorMessage = (err as any).error;
      }
      
      setError(errorMessage);
      setIsDeleting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                padding: '10px',
                background: '#fee2e2',
                borderRadius: '8px',
              }}
            >
              <AlertTriangle size={24} style={{ color: '#dc2626' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#0f172a' }}>
                Delete School - Step {step} of 3
              </h2>
              <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
                This action is permanent and cannot be undone
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            style={{
              padding: '8px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
            }}
            disabled={isDeleting}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {/* Step 1: Understand Data Loss */}
          {step === 1 && (
            <div>
              <div
                style={{
                  padding: '16px',
                  background: '#fef3c7',
                  border: '1px solid #fde047',
                  borderRadius: '8px',
                  marginBottom: '20px',
                }}
              >
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#92400e', marginBottom: '12px' }}>
                  ⚠️ Warning: Permanent Data Deletion
                </h3>
                <p style={{ fontSize: '14px', color: '#78350f', lineHeight: '1.6' }}>
                  Deleting this school will <strong>permanently remove ALL data</strong> including:
                </p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', marginBottom: '12px' }}>
                  What will be deleted:
                </h4>
                <ul
                  style={{
                    fontSize: '14px',
                    color: '#475569',
                    lineHeight: '1.8',
                    paddingLeft: '20px',
                  }}
                >
                  <li><strong>All user accounts:</strong> Students, Teachers, Principal</li>
                  <li><strong>Academic structure:</strong> Academic years, classrooms, subjects</li>
                  <li><strong>Student data:</strong> Enrollments, profiles, admission records</li>
                  <li><strong>Attendance records:</strong> All attendance sessions and entries</li>
                  <li><strong>Assessment data:</strong> All marks, assessments, and grade reports</li>
                  <li><strong>Assignments:</strong> All assignments and attached files</li>
                  <li><strong>Financial records:</strong> Fee categories, receipts, and transactions</li>
                  <li><strong>Timetables:</strong> All timetable entries and schedules</li>
                  <li><strong>Teaching assignments:</strong> All teacher-classroom-subject mappings</li>
                  <li><strong>Audit logs:</strong> All activity history</li>
                </ul>
              </div>

              <div
                style={{
                  padding: '16px',
                  background: '#fee2e2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  marginBottom: '20px',
                }}
              >
                <p style={{ fontSize: '14px', color: '#991b1b', lineHeight: '1.6' }}>
                  <strong>This operation is IRREVERSIBLE.</strong> Once deleted, the school and all its data cannot be recovered. There is no backup or undo option.
                </p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#0f172a',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={understood}
                    onChange={(e) => setUnderstood(e.target.checked)}
                    style={{ marginTop: '3px', cursor: 'pointer' }}
                  />
                  <span>
                    I understand that this will <strong>permanently delete</strong> the school "<strong>{schoolName}</strong>" (Code: {schoolCode}) and all associated data, and that this action <strong>cannot be undone</strong>.
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Step 2: Confirm School Name */}
          {step === 2 && (
            <div>
              <div
                style={{
                  padding: '16px',
                  background: '#fee2e2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  marginBottom: '20px',
                }}
              >
                <p style={{ fontSize: '14px', color: '#991b1b', lineHeight: '1.6' }}>
                  To prevent accidental deletion, please type the exact school name below.
                </p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#0f172a',
                    marginBottom: '8px',
                  }}
                >
                  Type the school name to confirm:
                </label>
                <div
                  style={{
                    padding: '12px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    marginBottom: '12px',
                    fontFamily: 'monospace',
                    fontSize: '16px',
                    color: '#0f172a',
                  }}
                >
                  {schoolName}
                </div>
                <input
                  type="text"
                  value={nameConfirmation}
                  onChange={(e) => setNameConfirmation(e.target.value)}
                  placeholder="Type school name here"
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '6px',
                    fontFamily: 'inherit',
                  }}
                />
                {nameConfirmation && nameConfirmation !== schoolName && (
                  <p style={{ fontSize: '13px', color: '#dc2626', marginTop: '8px' }}>
                    School name doesn't match. Please type it exactly as shown above.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Type DELETE Confirmation */}
          {step === 3 && (
            <div>
              <div
                style={{
                  padding: '16px',
                  background: '#fee2e2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  marginBottom: '20px',
                }}
              >
                <p style={{ fontSize: '14px', color: '#991b1b', lineHeight: '1.6', marginBottom: '8px' }}>
                  <strong>Final confirmation required.</strong>
                </p>
                <p style={{ fontSize: '14px', color: '#991b1b', lineHeight: '1.6' }}>
                  This is your last chance to cancel. Once you proceed, all data will be permanently deleted.
                </p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#0f172a',
                    marginBottom: '8px',
                  }}
                >
                  Type <span style={{ fontFamily: 'monospace', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>DELETE</span> (all caps) to confirm:
                </label>
                <input
                  type="text"
                  value={confirmationCode}
                  onChange={(e) => setConfirmationCode(e.target.value.toUpperCase())}
                  placeholder="Type DELETE here"
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '6px',
                    fontFamily: 'monospace',
                  }}
                />
              </div>

              {error && (
                <div
                  style={{
                    padding: '12px',
                    background: '#fee2e2',
                    border: '1px solid #fecaca',
                    borderRadius: '6px',
                    marginBottom: '20px',
                  }}
                >
                  <p style={{ fontSize: '14px', color: '#dc2626' }}>{error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '20px 24px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          {step > 1 && (
            <Button
              variant="secondary"
              onClick={() => setStep((step - 1) as 1 | 2)}
              disabled={isDeleting}
            >
              Back
            </Button>
          )}
          <div style={{ flex: 1 }} />
          <Button
            variant="secondary"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          {step < 3 ? (
            <Button
              onClick={handleNext}
              disabled={
                (step === 1 && !understood) ||
                (step === 2 && nameConfirmation !== schoolName)
              }
            >
              Next Step
            </Button>
          ) : (
            <Button
              onClick={handleDelete}
              disabled={confirmationCode !== 'DELETE' || isDeleting}
              style={{
                background: '#dc2626',
                color: '#ffffff',
              }}
            >
              {isDeleting ? (
                'Deleting...'
              ) : (
                <>
                  <Trash2 size={16} style={{ marginRight: '8px' }} />
                  Permanently Delete School
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
