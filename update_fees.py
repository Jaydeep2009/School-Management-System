import re

# Read the file
with open(r"c:\Users\jaysg\Desktop\SMS\School-Management-System\apps\web\src\pages\StudentFees.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add import for receipt generator
old_import = "import html2canvas from 'html2canvas';"
new_import = "import html2canvas from 'html2canvas';\nimport { generateReceiptPDF, generateReceiptImage } from '../utils/receiptGenerator';"
content = content.replace(old_import, new_import)

# 2. Replace downloadReceipt function
old_function = r"  const downloadReceipt = \(payment: any\) => \{[\s\S]*?URL\.revokeObjectURL\(url\);\s*\};"
new_functions = """  const downloadReceiptAsPDF = (payment: any) => {
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
  };

  const downloadReceiptAsImage = (payment: any) => {
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

content = re.sub(old_function, new_functions, content)

# 3. Replace download button
old_button = r"\{!payment\.is_voided && \(\s*<button\s*onClick=\{\(\) => downloadReceipt\(payment\)\}[\s\S]*?Download\s*</button>\s*\)\}"
new_buttons = """{!payment.is_voided && (
                            <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                              <button
                                onClick={() => downloadReceiptAsPDF(payment)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '8px 12px',
                                  background: '#2563eb',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '13px',
                                  fontWeight: 500,
                                  cursor: 'pointer',
                                  transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#1d4ed8'}
                                onMouseLeave={(e) => e.currentTarget.style.background = '#2563eb'}
                                title="Download as PDF"
                              >
                                <Download size={14} />
                                PDF
                              </button>
                              <button
                                onClick={() => downloadReceiptAsImage(payment)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '8px 12px',
                                  background: '#059669',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '13px',
                                  fontWeight: 500,
                                  cursor: 'pointer',
                                  transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#047857'}
                                onMouseLeave={(e) => e.currentTarget.style.background = '#059669'}
                                title="Download as Image"
                              >
                                <FileImage size={14} />
                                Image
                              </button>
                            </div>
                          )}"""

content = re.sub(old_button, new_buttons, content)

# Write back
with open(r"c:\Users\jaysg\Desktop\SMS\School-Management-System\apps\web\src\pages\StudentFees.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("File updated successfully!")
