const fs = require('fs');

console.log('Applying fixes...\n');

// Fix 1: Add Charges section to StudentFees.tsx
console.log('1. Adding charges section to StudentFees.tsx...');
let studentFeesContent = fs.readFileSync('apps/web/src/pages/StudentFees.tsx', 'utf8');

const chargesSection = `
        {/* Charge Details */}
        {!error && (
          <div style={{ marginBottom: '32px' }}>
            <Card>
              <div style={{ padding: '24px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '16px' }}>
                  Charge Details
                </h2>
                
                {isLoading ? (
                  <Skeleton height="150px" />
                ) : !fees?.ledger || fees.ledger.filter((e: any) => e.type === 'charge' && !e.is_voided).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                    <p>No charges recorded yet</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {fees.ledger
                      .filter((entry: any) => entry.type === 'charge' && !entry.is_voided)
                      .map((charge: any) => (
                      <div 
                        key={charge.id}
                        style={{ 
                          padding: '16px', 
                          background: '#f8fafc',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                            {charge.title}
                          </div>
                          <div style={{ fontSize: '13px', color: '#64748b' }}>
                            {charge.kind === 'fee' ? 'Fee' : charge.kind === 'concession' ? 'Concession' : 'Carry Forward'}
                            {charge.date && \` • Due: \${new Date(charge.date).toLocaleDateString('en-IN')}\`}
                          </div>
                        </div>
                        <div style={{ 
                          fontSize: '24px', 
                          fontWeight: 700, 
                          color: charge.kind === 'concession' ? '#16a34a' : '#0f172a',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <IndianRupee size={20} />
                          {charge.kind === 'concession' ? '-' : ''}{Math.abs(charge.amount).toLocaleString('en-IN')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}
`;

studentFeesContent = studentFeesContent.replace('        {/* Payment Receipts */', chargesSection + '\n        {/* Payment Receipts */}');
fs.writeFileSync('apps/web/src/pages/StudentFees.tsx', studentFeesContent, 'utf8');
console.log('   ✓ Charges section added\n');

// Fix 2: Update receipt generator
console.log('2. Updating receiptGenerator.ts...');
let receiptContent = fs.readFileSync('apps/web/src/utils/receiptGenerator.ts', 'utf8');

// Update interface
receiptContent = receiptContent.replace(
  /interface ReceiptData \{[^}]+\}/s,
  `interface ReceiptData {
  receipt_no: string;
  date: string;
  school_name: string;
  student_name: string;
  student_code: string;
  classroom_code: string;
  roll_number: string;
  admission_number: string;
  amount: number;
  payment_method: string;
  reference?: string;
}`
);

// Update school name
receiptContent = receiptContent.replace(
  'SCHOOL MANAGEMENT SYSTEM</h1>',
  '${data.school_name}</h1>'
);

// Add student code
receiptContent = receiptContent.replace(
  `          <div>
            <div style="color: #64748b; font-size: 12px; margin-bottom: 5px;">Class:</div>
            <div style="color: #0f172a; font-size: 16px; font-weight: 600;">\${data.classroom_code}</div>
          </div>`,
  `          <div>
            <div style="color: #64748b; font-size: 12px; margin-bottom: 5px;">Student Code:</div>
            <div style="color: #0f172a; font-size: 16px; font-weight: 600;">\${data.student_code}</div>
          </div>
          <div>
            <div style="color: #64748b; font-size: 12px; margin-bottom: 5px;">Class:</div>
            <div style="color: #0f172a; font-size: 16px; font-weight: 600;">\${data.classroom_code}</div>
          </div>`
);

fs.writeFileSync('apps/web/src/utils/receiptGenerator.ts', receiptContent, 'utf8');
console.log('   ✓ Receipt generator updated\n');

// Fix 3: Update StudentFees receipt calls
console.log('3. Updating StudentFees.tsx receipt function calls...');
studentFeesContent = fs.readFileSync('apps/web/src/pages/StudentFees.tsx', 'utf8');

// Update PDF call
studentFeesContent = studentFeesContent.replace(
  `    generateReceiptPDF({
      receipt_no: payment.receipt_no,
      date: payment.date,
      student_name: profile?.full_name || 'N/A',
      classroom_code: profile?.classroom_code || 'N/A',
      roll_number: profile?.roll_number || 'N/A',
      admission_number: profile?.admission_number || 'N/A',
      amount: payment.amount,
      payment_method: getPaymentMethodLabel(payment.method),
      reference: payment.reference
    });`,
  `    generateReceiptPDF({
      receipt_no: payment.receipt_no,
      date: payment.date,
      school_name: profile?.school_name || 'SCHOOL MANAGEMENT SYSTEM',
      student_name: profile?.full_name || 'N/A',
      student_code: profile?.student_code || 'N/A',
      classroom_code: profile?.classroom_code || 'N/A',
      roll_number: profile?.roll_number || 'N/A',
      admission_number: profile?.admission_number || 'N/A',
      amount: payment.amount,
      payment_method: getPaymentMethodLabel(payment.method),
      reference: payment.reference
    });`
);

// Update Image call
studentFeesContent = studentFeesContent.replace(
  `    generateReceiptImage({
      receipt_no: payment.receipt_no,
      date: payment.date,
      student_name: profile?.full_name || 'N/A',
      classroom_code: profile?.classroom_code || 'N/A',
      roll_number: profile?.roll_number || 'N/A',
      admission_number: profile?.admission_number || 'N/A',
      amount: payment.amount,
      payment_method: getPaymentMethodLabel(payment.method),
      reference: payment.reference
    });`,
  `    generateReceiptImage({
      receipt_no: payment.receipt_no,
      date: payment.date,
      school_name: profile?.school_name || 'SCHOOL MANAGEMENT SYSTEM',
      student_name: profile?.full_name || 'N/A',
      student_code: profile?.student_code || 'N/A',
      classroom_code: profile?.classroom_code || 'N/A',
      roll_number: profile?.roll_number || 'N/A',
      admission_number: profile?.admission_number || 'N/A',
      amount: payment.amount,
      payment_method: getPaymentMethodLabel(payment.method),
      reference: payment.reference
    });`
);

fs.writeFileSync('apps/web/src/pages/StudentFees.tsx', studentFeesContent, 'utf8');
console.log('   ✓ Receipt function calls updated\n');

console.log('✅ All fixes applied successfully!');
