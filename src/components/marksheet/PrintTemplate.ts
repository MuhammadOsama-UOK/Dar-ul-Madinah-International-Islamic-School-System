import { Student, Subject, ClassName } from '../../types/marksheet';

export function generatePrintHTML(students: Student[], subjects: Subject[], className: ClassName, autoSign: boolean = false, showGrOnPrint: boolean = false): string {
  let html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Dar-ul-Madinah_Marksheet_${className.replace(/\s+/g, '_')}</title>
      <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap" rel="stylesheet">
      <style>
        @page {
          size: A3 landscape;
          margin: 8mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          margin: 0;
          padding: 0;
          font-family: 'Segoe UI', Arial, Tahoma, Geneva, Verdana, sans-serif;
          background: #f1f5f9;
          color: #000000;
        }
        .no-print-bar {
          background: #111827;
          color: #ffffff;
          padding: 12px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: sticky;
          top: 0;
          z-index: 1000;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .no-print-bar h2 {
          margin: 0;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }
        .no-print-bar p {
          margin: 2px 0 0;
          font-size: 12px;
          color: #9ca3af;
        }
        .btn-print {
          background: #ffffff;
          color: #000000;
          border: none;
          font-weight: 800;
          font-size: 13px;
          padding: 8px 18px;
          border-radius: 6px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          transition: all 0.2s;
        }
        .btn-print:hover {
          background: #e5e7eb;
          transform: translateY(-1px);
        }
        .btn-close {
          background: transparent;
          color: #d1d5db;
          border: 1px solid #4b5563;
          font-weight: 600;
          font-size: 13px;
          padding: 8px 14px;
          border-radius: 6px;
          cursor: pointer;
          margin-left: 8px;
        }
        .btn-close:hover {
          background: #374151;
          color: #fff;
        }
        .pages-container {
          padding: 15px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 15px;
        }
        .page {
          width: 404mm; /* A3 landscape width 420mm - 16mm margins */
          min-height: 281mm; /* A3 landscape height 297mm - 16mm margins */
          max-height: 281mm;
          display: grid;
          grid-template-columns: 1fr 1fr;
          grid-template-rows: 1fr 1fr;
          gap: 8mm;
          page-break-after: always;
          break-after: page;
          box-sizing: border-box;
          background: #ffffff;
          padding: 6mm;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        .page:last-child {
          page-break-after: auto;
          break-after: auto;
        }
        .marksheet-card {
          border: 2.5px solid #000000;
          outline: 1px solid #000000;
          outline-offset: -5px;
          padding: 12px 14px;
          box-sizing: border-box;
          border-radius: 2px;
          display: flex;
          flex-direction: column;
          background-color: #ffffff;
          position: relative;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        .header {
          text-align: center;
          margin-bottom: 8px;
          border-bottom: 2px solid #000000;
          padding-bottom: 6px;
        }
        .header h1 {
          margin: 0;
          font-size: 20px;
          font-weight: 900;
          color: #000000;
          text-transform: uppercase;
          letter-spacing: 1.5px;
        }
        .header h2 {
          margin: 3px 0 0;
          font-size: 13.5px;
          color: #000000;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .student-details {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          font-size: 12.5px;
          color: #000000;
          background: #ffffff;
          padding: 6px 10px;
          border-radius: 2px;
          border: 1.5px solid #000000;
          line-height: 1.45;
        }
        .student-details strong {
          color: #000000;
          font-weight: 800;
        }
        .grade-badge {
          display: inline-block;
          border: 1.5px solid #000000;
          padding: 0 6px;
          font-weight: 900;
          font-size: 14px;
          margin-left: 4px;
          background: #f0f0f0;
        }
        .marks-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 8px;
          flex-grow: 1;
          background: #ffffff;
          border: 1.5px solid #000000;
        }
        .marks-table th, .marks-table td {
          border: 1.5px solid #000000;
          padding: 5px 3px;
          text-align: center;
          font-size: 11.5px;
          color: #000000;
        }
        .marks-table th {
          background-color: #f0f0f0 !important;
          color: #000000 !important;
          font-weight: 900;
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 0.2px;
        }
        .marks-table td.subject-label {
          text-align: left;
          padding-left: 6px;
          font-weight: 800;
        }
        .marks-table td.mark-cell {
          font-weight: 700;
          font-size: 12px;
        }
        .marks-table tr.total-row td {
          background-color: #f0f0f0 !important;
          font-weight: 900;
          color: #000000 !important;
          font-size: 12.5px;
          border-top: 2.5px solid #000000;
        }
        .remarks {
          text-align: center;
          font-style: italic;
          font-weight: 700;
          color: #000000;
          font-size: 12px;
          padding: 6px 10px;
          background-color: #ffffff;
          border: 1.5px solid #000000;
          border-radius: 2px;
          margin-bottom: 8px;
        }
        .remarks strong {
          font-style: normal;
          font-weight: 900;
          color: #000000;
          margin-right: 4px;
        }
        .footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: auto;
          font-size: 11.5px;
          color: #000000;
          padding-top: 4px;
          font-weight: 800;
        }
        .signature-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 150px;
        }
        .principal-sig {
          font-family: 'Dancing Script', cursive;
          font-size: 26px;
          color: #000000;
          font-weight: 900;
          margin-bottom: -5px;
        }
        .signature-line {
          border-top: 1.5px solid #000000;
          width: 100%;
          text-align: center;
          padding-top: 3px;
          margin-top: 22px;
          color: #000000;
          font-weight: 800;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .signature-line.with-sig {
          margin-top: 0;
        }

        /* PRINT MEDIA OVERRIDES - PURE SOLID BLACK INK FOR B&W PRINTERS */
        @media print {
          .no-print-bar {
            display: none !important;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .pages-container {
            padding: 0 !important;
            gap: 0 !important;
          }
          .page {
            width: 100% !important;
            height: 100% !important;
            box-shadow: none !important;
            padding: 0 !important;
            page-break-after: always !important;
            break-after: page !important;
          }
          .page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          * {
            color: #000000 !important;
            border-color: #000000 !important;
            box-shadow: none !important;
            text-shadow: none !important;
          }
          .marksheet-card {
            border: 2.5px solid #000000 !important;
            outline: 1px solid #000000 !important;
            background: #ffffff !important;
          }
          .marks-table th, .marks-table tr.total-row td {
            background-color: #f0f0f0 !important;
            color: #000000 !important;
          }
          .signature-line {
            border-top: 1.5px solid #000000 !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="no-print-bar">
        <div>
          <h2>DAR-UL-MADINAH MARKSHEETS — BLACK & WHITE PRINT READY</h2>
          <p>Optimized for sharp black laser/inkjet printing • A3 Landscape (4 marksheets per page)</p>
        </div>
        <div>
          <button class="btn-print" onclick="window.print()">
            🖨️ Print / Save as PDF
          </button>
          <button class="btn-close" onclick="window.close()">
            Close
          </button>
        </div>
      </div>

      <div class="pages-container">
  `;

  for (let i = 0; i < students.length; i += 4) {
    const chunk = students.slice(i, i + 4);
    html += `<div class="page">`;
    
    for (let j = 0; j < 4; j++) {
      if (chunk[j]) {
        html += generateMarksheet(chunk[j], subjects, className, autoSign, showGrOnPrint);
      } else {
        html += `<div style="visibility: hidden;"></div>`;
      }
    }
    html += `</div>`;
  }

  html += `
      </div>
    </body>
    </html>
  `;
  return html;
}

function getRemarks(pct: number): string {
  if (pct >= 90) return "Outstanding performance! Keep shining!";
  if (pct >= 80) return "Excellent work! Your hard work is paying off.";
  if (pct >= 70) return "Good effort! Keep striving for excellence.";
  if (pct >= 60) return "Satisfactory, but there is room for improvement.";
  if (pct >= 50) return "Needs more focus and hard work. You can do better!";
  return "Requires urgent attention and regular study habits.";
}

function generateMarksheet(student: Student, subjects: Subject[], className: ClassName, autoSign: boolean, showGrOnPrint: boolean): string {
  const totalMarks = subjects.reduce((sum, sub) => sum + (Number(student.marks[sub.id]) || 0), 0);
  const maxTotal = subjects.reduce((sum, sub) => sum + sub.maxMarks, 0);
  const percentage = maxTotal > 0 ? ((totalMarks / maxTotal) * 100).toFixed(2) : '0.00';
  
  // Calculate Grade
  let grade = 'F';
  const pct = Number(percentage);
  if (pct >= 80) grade = 'A+';
  else if (pct >= 70) grade = 'A';
  else if (pct >= 60) grade = 'B';
  else if (pct >= 50) grade = 'C';
  else if (pct >= 40) grade = 'D';

  const remarks = getRemarks(pct);

  let subjectHeaders = subjects.map(s => `<th>${s.name}</th>`).join('');
  let subjectMarks = subjects.map(s => {
    const m = student.marks[s.id];
    const val = (m !== undefined && m !== null && String(m).trim() !== '') ? m : '-';
    return `<td class="mark-cell">${val}</td>`;
  }).join('');
  let subjectMax = subjects.map(s => `<td class="mark-cell">${s.maxMarks}</td>`).join('');

  return `
    <div class="marksheet-card">
      <div class="header">
        <h1>Dar-ul-Madinah Gulshan BHS</h1>
        <h2>Monthly Test Marksheet 2026 - ${className}</h2>
      </div>
      
      <div class="student-details">
        <div>
          ${showGrOnPrint ? `<strong>GR No:</strong> <span>${student.grNo || 'N/A'}</span><br>` : ''}
          <strong>S.No:</strong> <span>${student.sNo}</span>
        </div>
        <div>
          <strong>Name:</strong> <span>${student.name.toUpperCase()}</span><br>
          <strong>Father:</strong> <span>${student.fatherName.toUpperCase()}</span>
        </div>
        <div style="text-align: right;">
          <strong>Grade:</strong> <span class="grade-badge">${grade}</span><br>
          <strong>Percentage:</strong> <strong>${percentage}%</strong>
        </div>
      </div>

      <table class="marks-table">
        <thead>
          <tr>
            <th class="subject-label" style="width: 22%;">Subject</th>
            ${subjectHeaders}
            <th style="width: 12%;">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="subject-label">Max Marks</td>
            ${subjectMax}
            <td class="mark-cell"><strong>${maxTotal}</strong></td>
          </tr>
          <tr class="total-row">
            <td class="subject-label">Obtained</td>
            ${subjectMarks}
            <td class="mark-cell" style="font-size: 13.5px;">${totalMarks}</td>
          </tr>
        </tbody>
      </table>

      <div class="remarks"><strong>Remarks:</strong> &ldquo;${remarks}&rdquo;</div>

      <div class="footer">
        <div class="signature-box">
          <div class="signature-line">Class Teacher</div>
        </div>
        <div class="signature-box">
          ${autoSign ? `<div class="principal-sig">Muneer Riaz</div>` : `<div style="height: 26px;"></div>`}
          <div class="signature-line ${autoSign ? 'with-sig' : ''}">Principal</div>
        </div>
      </div>
    </div>
  `;
}
