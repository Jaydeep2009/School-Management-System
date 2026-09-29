/**
 * Fee Receipt Generator Utility
 * 
 * Generates professional fee receipts in PDF and Image formats
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ReceiptData {
  receipt_no: string;
  date: string;
  student_name: string;
  classroom_code: string;
  roll_number: string;
  admission_number: string;
  amount: number;
  payment_method: string;
  reference?: string;
}

function createReceiptHTML(data: ReceiptData): string {
  return `
    <div style="border: 3px solid #2563eb; padding: 40px; border-radius: 12px; background: white;">
      <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #2563eb; padding-bottom: 25px;">
        <h1 style="color: #1e40af; font-size: 36px; margin: 0 0 10px 0; font-weight: 700;">SCHOOL MANAGEMENT SYSTEM</h1>
        <h2 style="color: #64748b; font-size: 22px; margin: 0; font-weight: 500;">Fee Payment Receipt</h2>
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px; margin-bottom: 35px;">
        <div style="background: #eff6ff; padding: 15px; border-radius: 8px; border-left: 4px solid #2563eb;">
          <div style="color: #64748b; font-size: 13px; margin-bottom: 6px; font-weight: 500;">Receipt No:</div>
          <div style="color: #0f172a; font-size: 20px; font-weight: 700; font-family: 'Courier New', monospace;">#${data.receipt_no}</div>
        </div>
        <div style="background: #eff6ff; padding: 15px; border-radius: 8px; border-left: 4px solid #2563eb;">
          <div style="color: #64748b; font-size: 13px; margin-bottom: 6px; font-weight: 500;">Date:</div>
          <div style="color: #0f172a; font-size: 20px; font-weight: 700;">${new Date(data.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
        </div>
      </div>
      
      <div style="background: #f8fafc; padding: 25px; border-radius: 10px; margin-bottom: 35px; border: 2px solid #e2e8f0;">
        <h3 style="color: #1e40af; font-size: 16px; margin: 0 0 20px 0; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">Student Information</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 18px;">
          <div>
            <div style="color: #64748b; font-size: 12px; margin-bottom: 5px;">Student Name:</div>
            <div style="color: #0f172a; font-size: 16px; font-weight: 600;">${data.student_name}</div>
          </div>
          <div>
            <div style="color: #64748b; font-size: 12px; margin-bottom: 5px;">Class:</div>
            <div style="color: #0f172a; font-size: 16px; font-weight: 600;">${data.classroom_code}</div>
          </div>
          <div>
            <div style="color: #64748b; font-size: 12px; margin-bottom: 5px;">Roll Number:</div>
            <div style="color: #0f172a; font-size: 16px; font-weight: 600;">${data.roll_number}</div>
          </div>
          <div>
            <div style="color: #64748b; font-size: 12px; margin-bottom: 5px;">Admission Number:</div>
            <div style="color: #0f172a; font-size: 16px; font-weight: 600;">${data.admission_number}</div>
          </div>
        </div>
      </div>
      
      <div style="background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); padding: 30px; border-radius: 10px; margin-bottom: 35px; border: 3px solid #86efac;">
        <h3 style="color: #166534; font-size: 16px; margin: 0 0 20px 0; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">Payment Details</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div>
            <div style="color: #166534; font-size: 13px; margin-bottom: 8px; font-weight: 500;">Amount Paid:</div>
            <div style="color: #0f172a; font-size: 32px; font-weight: 900; display: flex; align-items: center; gap: 4px;">
              <span>?</span>${data.amount.toLocaleString('en-IN')}
            </div>
          </div>
          <div>
            <div style="color: #166534; font-size: 13px; margin-bottom: 8px; font-weight: 500;">Payment Method:</div>
            <div style="color: #0f172a; font-size: 18px; font-weight: 700;">${data.payment_method}</div>
          </div>
          ${data.reference ? `
          <div style="grid-column: 1 / -1;">
            <div style="color: #166534; font-size: 13px; margin-bottom: 8px; font-weight: 500;">Transaction Reference:</div>
            <div style="color: #0f172a; font-size: 15px; font-weight: 600; font-family: 'Courier New', monospace;">${data.reference}</div>
          </div>
          ` : ''}
        </div>
      </div>
      
      <div style="text-align: center; padding-top: 25px; border-top: 3px dashed #cbd5e1;">
        <div style="display: inline-flex; align-items: center; gap: 10px; background: #16a34a; color: white; padding: 12px 30px; border-radius: 8px; margin-bottom: 15px;">
          <span style="font-size: 24px;">?</span>
          <span style="font-size: 18px; font-weight: 700; letter-spacing: 2px;">PAID</span>
        </div>
        <div style="color: #94a3b8; font-size: 13px; line-height: 1.8; margin-top: 15px;">
          This is a computer-generated receipt and does not require a signature.<br>
          For any queries, please contact the school administration.
        </div>
      </div>
    </div>
  `;
}

export async function generateReceiptPDF(data: ReceiptData): Promise<void> {
  const receiptDiv = document.createElement('div');
  receiptDiv.style.cssText = 'position: absolute; left: -9999px; width: 900px; padding: 50px; background: white; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;';
  receiptDiv.innerHTML = createReceiptHTML(data);
  
  document.body.appendChild(receiptDiv);
  
  try {
    const canvas = await html2canvas(receiptDiv, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 1000
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save(`receipt_${data.receipt_no}.pdf`);
  } finally {
    document.body.removeChild(receiptDiv);
  }
}

export async function generateReceiptImage(data: ReceiptData): Promise<void> {
  const receiptDiv = document.createElement('div');
  receiptDiv.style.cssText = 'position: absolute; left: -9999px; width: 900px; padding: 50px; background: white; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;';
  receiptDiv.innerHTML = createReceiptHTML(data);
  
  document.body.appendChild(receiptDiv);
  
  try {
    const canvas = await html2canvas(receiptDiv, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 1000
    });
    
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `receipt_${data.receipt_no}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    }, 'image/png');
  } finally {
    document.body.removeChild(receiptDiv);
  }
}