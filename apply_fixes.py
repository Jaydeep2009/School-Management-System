import re

# Fix 1: Add Charges Details section to StudentFees.tsx
print("Fixing StudentFees.tsx - Adding charges details...")
with open(r"c:\Users\jaysg\Desktop\SMS\School-Management-System\apps\web\src\pages\StudentFees.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add charges section after the breakdown and before Payment Receipts
charges_section = """
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

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
                            {charge.date && ` • Due: ${new Date(charge.date).toLocaleDateString('en-IN')}`}
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

        {/* Payment Receipts */"""

# Replace the section before Payment Receipts
old_pattern = r"                  </div>\s*\}\)\s*}\s*</div>\s*</Card>\s*</div>\s*\}\)\s*}\s*\s*/\* Payment Receipts \*/"
content = re.sub(old_pattern, charges_section, content, count=1)

with open(r"c:\Users\jaysg\Desktop\SMS\School-Management-System\apps\web\src\pages\StudentFees.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("? StudentFees.tsx updated with charges section")

# Fix 2: Check and update StudentProfile.tsx
print("\nFixing StudentProfile.tsx...")
try:
    with open(r"c:\Users\jaysg\Desktop\SMS\School-Management-System\apps\web\src\pages\StudentProfile.tsx", "r", encoding="utf-8") as f:
        profile_content = f.read()
    print("? StudentProfile.tsx exists")
except FileNotFoundError:
    print("? StudentProfile.tsx not found - will need to check the actual profile page")

# Fix 3: Update receipt generator with actual school name
print("\nFixing receiptGenerator.ts - adding school name...")
with open(r"c:\Users\jaysg\Desktop\SMS\School-Management-System\apps\web\src\utils\receiptGenerator.ts", "r", encoding="utf-8") as f:
    receipt_content = f.read()

# Update the ReceiptData interface to include school_name
old_interface = """interface ReceiptData {
  receipt_no: string;
  date: string;
  student_name: string;
  classroom_code: string;
  roll_number: string;
  admission_number: string;
  amount: number;
  payment_method: string;
  reference?: string;
}"""

new_interface = """interface ReceiptData {
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
}"""

receipt_content = receipt_content.replace(old_interface, new_interface)

# Update the school name in the header
receipt_content = receipt_content.replace(
    '<h1 style="color: #1e40af; font-size: 36px; margin: 0 0 10px 0; font-weight: 700;">SCHOOL MANAGEMENT SYSTEM</h1>',
    '<h1 style="color: #1e40af; font-size: 36px; margin: 0 0 10px 0; font-weight: 700;">${data.school_name}</h1>'
)

# Add student code to the student info section
receipt_content = receipt_content.replace(
    """          <div>
            <div style="color: #64748b; font-size: 12px; margin-bottom: 5px;">Student Name:</div>
            <div style="color: #0f172a; font-size: 16px; font-weight: 600;">${data.student_name}</div>
          </div>""",
    """          <div>
            <div style="color: #64748b; font-size: 12px; margin-bottom: 5px;">Student Name:</div>
            <div style="color: #0f172a; font-size: 16px; font-weight: 600;">${data.student_name}</div>
          </div>
          <div>
            <div style="color: #64748b; font-size: 12px; margin-bottom: 5px;">Student Code:</div>
            <div style="color: #0f172a; font-size: 16px; font-weight: 600;">${data.student_code}</div>
          </div>"""
)

with open(r"c:\Users\jaysg\Desktop\SMS\School-Management-System\apps\web\src\utils\receiptGenerator.ts", "w", encoding="utf-8") as f:
    f.write(receipt_content)

print("? receiptGenerator.ts updated")

# Fix 4: Update StudentFees.tsx to pass school_name and student_code to receipt generator
print("\nUpdating StudentFees.tsx receipt generator calls...")
with open(r"c:\Users\jaysg\Desktop\SMS\School-Management-System\apps\web\src\pages\StudentFees.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Update downloadReceiptAsPDF
old_pdf_call = """  const downloadReceiptAsPDF = (payment: any) => {
    generateReceiptPDF({
      receipt_no: payment.receipt_no,
      date: payment.date,
      student_name: profile?.full_name || 'N/A',
      classroom_code: profile?.classroom_code || 'N/A',
      roll_number: profile?.roll_number || 'N/A',
      admission_number: profile?.admission_number || 'N/A',
      amount: payment.amount,
      payment_method: getPaymentMethodLabel(payment.method),
      reference: payment.reference
    });
  };"""

new_pdf_call = """  const downloadReceiptAsPDF = (payment: any) => {
    generateReceiptPDF({
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
    });
  };"""

content = content.replace(old_pdf_call, new_pdf_call)

# Update downloadReceiptAsImage
old_image_call = """  const downloadReceiptAsImage = (payment: any) => {
    generateReceiptImage({
      receipt_no: payment.receipt_no,
      date: payment.date,
      student_name: profile?.full_name || 'N/A',
      classroom_code: profile?.classroom_code || 'N/A',
      roll_number: profile?.roll_number || 'N/A',
      admission_number: profile?.admission_number || 'N/A',
      amount: payment.amount,
      payment_method: getPaymentMethodLabel(payment.method),
      reference: payment.reference
    });
  };"""

new_image_call = """  const downloadReceiptAsImage = (payment: any) => {
    generateReceiptImage({
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
    });
  };"""

content = content.replace(old_image_call, new_image_call)

with open(r"c:\Users\jaysg\Desktop\SMS\School-Management-System\apps\web\src\pages\StudentFees.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("? StudentFees.tsx receipt calls updated")

print("\n? All fixes applied successfully!")
