import { Student, Subject, ClassName } from '../../types/marksheet';

export function generatePrintHTML(students: Student[], subjects: Subject[], className: ClassName): string {
  let html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Dar-ul-Madinah_Marksheet_${className.replace(/\s+/g, '_')}</title>
      <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap" rel="stylesheet">
      <style>
        @page { size: A3 landscape; margin: 10mm; }
        body {
          margin: 0;
          padding: 0;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: #fff;
          color: #000;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .page {
          width: 100%;
          height: 277mm; /* A3 landscape height ~297mm minus margins */
          display: grid;
          grid-template-columns: 1fr 1fr;
          grid-template-rows: 1fr 1fr;
          gap: 10mm;
          page-break-after: always;
          box-sizing: border-box;
        }
        .page:last-child {
          page-break-after: auto;
        }
        .marksheet-card {
          border: 2px solid #1e3a8a; /* Deep blue border */
          padding: 15px;
          box-sizing: border-box;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          background-color: #f8fafc;
          position: relative;
        }
        .header {
          text-align: center;
          margin-bottom: 15px;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 10px;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          color: #1e3a8a;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .header h2 {
          margin: 5px 0 0;
          font-size: 16px;
          color: #475569;
          font-weight: 600;
        }
        .student-details {
          display: flex;
          justify-content: space-between;
          margin-bottom: 15px;
          font-size: 14px;
          color: #334155;
          background: #fff;
          padding: 10px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }
        .student-details > div {
          flex: 1;
        }
        .marks-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 10px;
          flex-grow: 1;
          background: #fff;
        }
        .marks-table th, .marks-table td {
          border: 1px solid #cbd5e1;
          padding: 8px 4px;
          text-align: center;
          font-size: 12px;
        }
        .marks-table th {
          background-color: #f1f5f9 !important;
          color: #0f172a;
          font-weight: bold;
          text-transform: uppercase;
          font-size: 11px;
        }
        .marks-table tr.total-row td {
          background-color: #e0f2fe !important;
          font-weight: bold;
          color: #0369a1;
        }
        .remarks {
          text-align: center;
          font-style: italic;
          font-weight: 600;
          color: #1e3a8a;
          font-size: 13px;
          padding: 8px;
          background-color: #e0f2fe;
          border-radius: 6px;
          margin-bottom: 15px;
        }
        .footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: auto;
          font-size: 12px;
          color: #64748b;
          padding-top: 10px;
        }
        .signature-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 150px;
        }
        .principal-sig {
          font-family: 'Dancing Script', cursive;
          font-size: 28px;
          color: #1e3a8a;
          margin-bottom: -5px; /* Pull closer to the line */
        }
        .signature-line {
          border-top: 1px solid #64748b;
          width: 100%;
          text-align: center;
          padding-top: 4px;
          margin-top: 25px; /* Space for manual signature if needed */
        }
        .signature-line.with-sig {
          margin-top: 0;
        }
      </style>
    </head>
    <body>
  `;

  for (let i = 0; i < students.length; i += 4) {
    const chunk = students.slice(i, i + 4);
    html += `<div class="page">`;
    
    for (let j = 0; j < 4; j++) {
      if (chunk[j]) {
        html += generateMarksheet(chunk[j], subjects, className);
      } else {
        html += `<div style="visibility: hidden;"></div>`;
      }
    }
    html += `</div>`;
  }

  html += `
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

function generateMarksheet(student: Student, subjects: Subject[], className: ClassName): string {
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
  let subjectMarks = subjects.map(s => `<td>${student.marks[s.id] ?? '-'}</td>`).join('');
  let subjectMax = subjects.map(s => `<td>${s.maxMarks}</td>`).join('');

  return `
    <div class="marksheet-card">
      <div class="header">
        <h1>Dar-ul-Madinah Gulshan BHS</h1>
        <h2>Consolidated Award List (Bi-Monthly Tests 2026) - ${className}</h2>
      </div>
      
      <div class="student-details">
        <div>
          <strong>GR No:</strong> ${student.grNo || 'N/A'}<br>
          <strong>S.No:</strong> ${student.sNo}
        </div>
        <div>
          <strong>Name:</strong> ${student.name.toUpperCase()}<br>
          <strong>Father:</strong> ${student.fatherName.toUpperCase()}
        </div>
        <div style="text-align: right;">
          <strong>Grade:</strong> <span style="color: #0369a1; font-size: 16px;">${grade}</span><br>
          <strong>Percentage:</strong> ${percentage}%
        </div>
      </div>

      <table class="marks-table">
        <thead>
          <tr>
            <th>Subject</th>
            ${subjectHeaders}
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Max Marks</strong></td>
            ${subjectMax}
            <td><strong>${maxTotal}</strong></td>
          </tr>
          <tr class="total-row">
            <td>Obtained</td>
            ${subjectMarks}
            <td>${totalMarks}</td>
          </tr>
        </tbody>
      </table>

      <div class="remarks">Remarks: "${remarks}"</div>

      <div class="footer">
        <div class="signature-box">
          <div class="signature-line">Class Teacher</div>
        </div>
        <div class="signature-box">
          <div class="principal-sig">Muneer Riaz</div>
          <div class="signature-line with-sig">Principal</div>
        </div>
      </div>
    </div>
  `;
}
