import React, { useState, useEffect } from 'react';
import { db, doc, onSnapshot } from '../../firebase';
import { ClassName, Student, Subject } from '../../types/marksheet';
import { INITIAL_STUDENTS } from '../../data/initialStudents';
import { DEFAULT_CLASS_SUBJECTS } from '../../data/marksheetData';
import { Download, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const CLASS_NAMES: ClassName[] = ['Class IV', 'Class V', 'Class VI', 'Class VII', 'Class VIII', 'Class IX', 'Class X', 'Hifz Class'];

export default function CopyCheckingList() {
  const [data, setData] = useState<Record<ClassName, Student[]>>(INITIAL_STUDENTS);
  const [subjectsConfig, setSubjectsConfig] = useState<Record<ClassName, Subject[]>>(DEFAULT_CLASS_SUBJECTS);
  
  const [selectedClasses, setSelectedClasses] = useState<ClassName[]>(['Class IV']);
  const [selectedSubjectName, setSelectedSubjectName] = useState<string>('');
  const [teacherName, setTeacherName] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    // Listen to Firebase and sync
    const unsubData = onSnapshot(doc(db, 'marksheets', 'studentsData'), (docSnap) => {
      if (docSnap.exists()) {
        setData(docSnap.data() as Record<ClassName, Student[]>);
      }
    });

    const unsubSubj = onSnapshot(doc(db, 'marksheets', 'subjectsConfig'), (docSnap) => {
      if (docSnap.exists()) {
        setSubjectsConfig(docSnap.data() as Record<ClassName, Subject[]>);
      }
    });

    return () => {
      unsubData();
      unsubSubj();
    };
  }, []);

  const availableSubjects = Array.from(new Set(
    selectedClasses.flatMap(cls => (subjectsConfig[cls] || DEFAULT_CLASS_SUBJECTS[cls]).map(s => s.name))
  )).sort();

  useEffect(() => {
    if (availableSubjects.length > 0 && !availableSubjects.includes(selectedSubjectName)) {
      setSelectedSubjectName(availableSubjects[0]);
    }
  }, [selectedClasses, subjectsConfig, selectedSubjectName, availableSubjects]);

  const handleDownloadPDF = async () => {
    if (!teacherName.trim()) {
      alert("Please enter the teacher's name.");
      return;
    }
    
    if (selectedClasses.length === 0) {
      alert("Please select at least one class.");
      return;
    }

    setIsGenerating(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      let isFirstPage = true;
      
      for (let i = 0; i < selectedClasses.length; i++) {
        const cls = selectedClasses[i];
        const students = data[cls] || [];
        const numPages = Math.max(1, Math.ceil(students.length / 15));

        for (let j = 0; j < numPages; j++) {
          const pageEl = document.getElementById(`pdf-page-${i}-${j}`);
          if (pageEl) {
            pageEl.style.display = 'block'; // Ensure it's visible for rendering
            const canvas = await html2canvas(pageEl, { scale: 2, useCORS: true, logging: false });
            pageEl.style.display = 'none'; // Hide again

            const imgData = canvas.toDataURL('image/png');
            
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const a4Height = pdf.internal.pageSize.getHeight();
            
            let pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            let finalWidth = pdfWidth;
            let xOffset = 0;
            
            if (pdfHeight > a4Height) {
              pdfHeight = a4Height;
              finalWidth = (canvas.width * pdfHeight) / canvas.height;
              xOffset = (pdfWidth - finalWidth) / 2;
            }
            
            if (!isFirstPage) pdf.addPage();
            pdf.addImage(imgData, 'PNG', xOffset, 0, finalWidth, pdfHeight);
            isFirstPage = false;
          }
        }
      }
      
      const safeSubject = selectedSubjectName.replace(/[^a-zA-Z0-9]/g, '_');
      const safeTeacher = teacherName.replace(/[^a-zA-Z0-9]/g, '_') || 'Teacher';
      const dateStr = new Date().toISOString().split('T')[0];
      
      pdf.save(`Copy_Checking_${safeSubject}_${safeTeacher}_${dateStr}.pdf`);
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const currentPreviewStudents = selectedClasses.length > 0 ? (data[selectedClasses[0]] || []) : [];

  return (
    <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-xl shadow-blue-900/5">
      <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
          <Download size={20} />
        </div>
        <h2 className="text-xl font-bold text-blue-900">Copy Checking List Generator</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="md:col-span-3">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Select Classes (Multiple)</label>
          <div className="flex flex-wrap gap-2">
            {CLASS_NAMES.map(cls => (
              <button
                key={cls}
                onClick={() => {
                  if (selectedClasses.includes(cls)) {
                    setSelectedClasses(selectedClasses.filter(c => c !== cls));
                  } else {
                    setSelectedClasses([...selectedClasses, cls].sort((a, b) => CLASS_NAMES.indexOf(a) - CLASS_NAMES.indexOf(b)));
                  }
                }}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${selectedClasses.includes(cls) ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {cls}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Select Subject</label>
          <select 
            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            value={selectedSubjectName}
            onChange={(e) => setSelectedSubjectName(e.target.value)}
          >
            {availableSubjects.map(subName => (
              <option key={subName} value={subName}>{subName}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Teacher Name</label>
          <input 
            type="text"
            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Enter teacher's name"
            value={teacherName}
            onChange={(e) => setTeacherName(e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-between items-center bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6">
        <div>
          <p className="font-semibold text-blue-900">Total Classes Selected: {selectedClasses.length}</p>
          <p className="text-sm text-blue-700">Generates a multi-page PDF (one page per class) with empty columns for 4 weeks.</p>
        </div>
        <button 
          onClick={handleDownloadPDF}
          disabled={isGenerating || selectedClasses.length === 0}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-md shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
          <span>{isGenerating ? 'Generating...' : 'Download PDF'}</span>
        </button>
      </div>
      
      {/* Preview table */}
      <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm hidden md:block">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 text-sm font-semibold text-gray-700">
          Preview for: {selectedClasses[0] || 'No class selected'}
        </div>
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 font-semibold text-center border-r border-gray-200 w-16">S.No</th>
              <th className="px-4 py-3 font-semibold border-r border-gray-200">Student Name</th>
              <th className="px-4 py-3 font-semibold text-center border-r border-gray-200 w-24">Week 1</th>
              <th className="px-4 py-3 font-semibold text-center border-r border-gray-200 w-24">Week 2</th>
              <th className="px-4 py-3 font-semibold text-center border-r border-gray-200 w-24">Week 3</th>
              <th className="px-4 py-3 font-semibold text-center border-r border-gray-200 w-24">Week 4</th>
              <th className="px-4 py-3 font-semibold text-center w-32">Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {currentPreviewStudents.slice(0, 5).map((s, i) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-center border-r border-gray-200 text-gray-500">{i + 1}</td>
                <td className="px-4 py-3 border-r border-gray-200">
                  <div className="font-bold text-gray-800 uppercase">{s.name}</div>
                  <div className="text-xs text-gray-500 uppercase">{s.fatherName}</div>
                </td>
                <td className="px-4 py-3 border-r border-gray-200 bg-white"></td>
                <td className="px-4 py-3 border-r border-gray-200 bg-white"></td>
                <td className="px-4 py-3 border-r border-gray-200 bg-white"></td>
                <td className="px-4 py-3 border-r border-gray-200 bg-white"></td>
                <td className="px-4 py-3 bg-white"></td>
              </tr>
            ))}
            {currentPreviewStudents.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">No students available for this class.</td>
              </tr>
            )}
          </tbody>
        </table>
        {currentPreviewStudents.length > 5 && (
          <div className="bg-gray-50 p-3 text-center text-sm text-gray-500 border-t border-gray-200">
            And {currentPreviewStudents.length - 5} more students...
          </div>
        )}
      </div>

      {/* Hidden Divs for PDF Generation */}
      <div className="absolute left-[-9999px] top-[-9999px]">
        {selectedClasses.map((cls, idx) => {
          const students = data[cls] || [];
          const chunks = students.length > 0 ? Array.from({ length: Math.ceil(students.length / 15) }, (_, i) => students.slice(i * 15, i * 15 + 15)) : [[]];
          
          return chunks.map((chunk, chunkIdx) => (
            <div key={`${cls}-${chunkIdx}`} id={`pdf-page-${idx}-${chunkIdx}`} style={{ display: 'none', width: '210mm', padding: '15mm', boxSizing: 'border-box', backgroundColor: 'white', color: 'black', fontFamily: 'sans-serif' }}>
              <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid #1e3a8a', paddingBottom: '10px' }}>
                <h1 style={{ margin: 0, fontSize: '24px', color: '#1e3a8a', textTransform: 'uppercase' }}>Dar-ul-Madinah Gulshan BHS</h1>
                <h2 style={{ margin: '5px 0', fontSize: '18px', color: '#334155' }}>Monthly Copy Checking Record</h2>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontWeight: 'bold', fontSize: '14px' }}>
                <div>Class: {cls} {chunks.length > 1 ? `(Page ${chunkIdx + 1}/${chunks.length})` : ''}</div>
                <div>Subject: {selectedSubjectName}</div>
                <div>Teacher: {teacherName}</div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ border: '1px solid #cbd5e1', padding: '8px 5px', backgroundColor: '#f1f5f9', color: '#0f172a', fontSize: '12px', width: '4%' }}>S.No</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '8px 5px', backgroundColor: '#f1f5f9', color: '#0f172a', fontSize: '12px', width: '6%' }}>GR No</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '8px 5px', backgroundColor: '#f1f5f9', color: '#0f172a', fontSize: '12px', textAlign: 'left', width: '16%' }}>Student Name</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '8px 5px', backgroundColor: '#f1f5f9', color: '#0f172a', fontSize: '12px', textAlign: 'left', width: '16%' }}>Father's Name</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '8px 5px', backgroundColor: '#f1f5f9', color: '#0f172a', fontSize: '12px', width: '9%' }}>Week 1</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '8px 5px', backgroundColor: '#f1f5f9', color: '#0f172a', fontSize: '12px', width: '9%' }}>Week 2</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '8px 5px', backgroundColor: '#f1f5f9', color: '#0f172a', fontSize: '12px', width: '9%' }}>Week 3</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '8px 5px', backgroundColor: '#f1f5f9', color: '#0f172a', fontSize: '12px', width: '9%' }}>Week 4</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '8px 5px', backgroundColor: '#f1f5f9', color: '#0f172a', fontSize: '12px', width: '22%' }}>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {chunk.map((s, i) => {
                    const absoluteIndex = chunkIdx * 15 + i;
                    return (
                      <tr key={s.id}>
                        <td style={{ border: '1px solid #cbd5e1', padding: '8px 5px', textAlign: 'center', fontSize: '13px' }}>{absoluteIndex + 1}</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '8px 5px', textAlign: 'center', fontSize: '13px' }}>{s.grNo}</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '8px 5px', textAlign: 'left', fontSize: '13px', fontWeight: 'bold' }}>{s.name.toUpperCase()}</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '8px 5px', textAlign: 'left', fontSize: '13px', color: '#475569' }}>{s.fatherName.toUpperCase()}</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '8px 5px' }}></td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '8px 5px' }}></td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '8px 5px' }}></td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '8px 5px' }}></td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '8px 5px' }}></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ));
        })}
      </div>
    </div>
  );
}

