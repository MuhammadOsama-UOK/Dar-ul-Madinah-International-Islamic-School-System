import React, { useState, useEffect } from 'react';
import { db, doc, onSnapshot } from '../../firebase';
import { ClassName, Student, Subject } from '../../types/marksheet';
import { INITIAL_STUDENTS } from '../../data/initialStudents';
import { DEFAULT_CLASS_SUBJECTS, INITIAL_CLASSES } from '../../data/marksheetData';
import { Download, Loader2, Sparkles, CheckCircle2, RotateCcw, Printer, FileSpreadsheet, User, BookOpen } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export type NatureOfTestKey = 'O' | 'W' | 'B';

export interface DayColumnConfig {
  dayNumber: number;
  date: string;
  subject: string;
  natureOfTest: NatureOfTestKey;
  maxMarks: number;
}

const DEFAULT_DAYS_COUNT = 9;

export default function ReinforcementExecution() {
  const [data, setData] = useState<Record<ClassName, Student[]>>(INITIAL_STUDENTS);
  const [subjectsConfig, setSubjectsConfig] = useState<Record<ClassName, Subject[]>>(DEFAULT_CLASS_SUBJECTS);
  
  const [selectedClasses, setSelectedClasses] = useState<ClassName[]>(['Class IV']);
  const [selectedSubjectName, setSelectedSubjectName] = useState<string>('English');
  const [teacherName, setTeacherName] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [studentsPerPage, setStudentsPerPage] = useState<number>(20);

  // 9 Columns Configuration for 9 Days Reinforcement Plan
  const [columnsConfig, setColumnsConfig] = useState<DayColumnConfig[]>(() => 
    Array.from({ length: DEFAULT_DAYS_COUNT }, (_, i) => ({
      dayNumber: i + 1,
      date: '', // blank for manual entry on print
      subject: '', // will default to selectedSubjectName
      natureOfTest: (i % 3 === 0 ? 'O' : i % 3 === 1 ? 'W' : 'B') as NatureOfTestKey,
      maxMarks: 10
    }))
  );

  useEffect(() => {
    // Listen to Firebase and sync student & subject configurations
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
    selectedClasses.flatMap(cls => (subjectsConfig[cls] || DEFAULT_CLASS_SUBJECTS[cls] || []).map(s => s.name))
  )).sort();

  useEffect(() => {
    if (availableSubjects.length > 0 && !availableSubjects.includes(selectedSubjectName)) {
      setSelectedSubjectName(availableSubjects[0]);
    }
  }, [selectedClasses, subjectsConfig, selectedSubjectName, availableSubjects]);

  const handleNatureChange = (colIndex: number, nature: NatureOfTestKey) => {
    setColumnsConfig(prev => prev.map((col, idx) => idx === colIndex ? { ...col, natureOfTest: nature } : col));
  };

  const handleSetAllNature = (nature: NatureOfTestKey) => {
    setColumnsConfig(prev => prev.map(col => ({ ...col, natureOfTest: nature })));
  };

  const handleResetDays = () => {
    setColumnsConfig(
      Array.from({ length: DEFAULT_DAYS_COUNT }, (_, i) => ({
        dayNumber: i + 1,
        date: '',
        subject: '',
        natureOfTest: (i % 3 === 0 ? 'O' : i % 3 === 1 ? 'W' : 'B') as NatureOfTestKey,
        maxMarks: 10
      }))
    );
  };

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
      // Portrait A4 orientation with optimal page-fill and black & white print ready layout
      const pdf = new jsPDF('p', 'mm', 'a4');
      let isFirstPage = true;
      
      for (let i = 0; i < selectedClasses.length; i++) {
        const cls = selectedClasses[i];
        const students = data[cls] || [];
        const numPages = Math.max(1, Math.ceil(students.length / studentsPerPage));

        for (let j = 0; j < numPages; j++) {
          const pageEl = document.getElementById(`reinforcement-pdf-page-${i}-${j}`);
          if (pageEl) {
            pageEl.style.display = 'flex'; // make visible for canvas capture
            const canvas = await html2canvas(pageEl, { 
              scale: 2.5, 
              useCORS: true, 
              logging: false,
              backgroundColor: '#ffffff'
            });
            pageEl.style.display = 'none'; // hide again

            const imgData = canvas.toDataURL('image/png');
            
            const pdfWidth = 210;
            const pdfHeight = 297;
            
            if (!isFirstPage) pdf.addPage('a4', 'p');
            // Full A4 page fill without shrinking or extra border padding
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
            isFirstPage = false;
          }
        }
      }
      
      const safeSubject = (selectedSubjectName || 'Subject').replace(/[^a-zA-Z0-9]/g, '_');
      const safeTeacher = teacherName.replace(/[^a-zA-Z0-9]/g, '_') || 'Teacher';
      const dateStr = new Date().toISOString().split('T')[0];
      
      pdf.save(`Students_Reinforcement_Record_${safeSubject}_${safeTeacher}_${dateStr}.pdf`);
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const currentPreviewClass = selectedClasses[0] || 'Class IV';
  const currentPreviewStudents = data[currentPreviewClass] || [];

  return (
    <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-xl shadow-blue-900/5">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-200">
            <FileSpreadsheet size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-blue-950">Students' Reinforcement Record Generator</h2>
            <p className="text-xs text-gray-500">9 Days Reinforcement Plan Execution Sheet with Customizable Nature of Test</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleResetDays}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <RotateCcw size={14} /> Reset Test Keys
          </button>
        </div>
      </div>

      {/* Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* Class Selection */}
        <div className="lg:col-span-12 bg-slate-50/70 p-4 rounded-xl border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <span>Select Classes for Execution Record</span>
              <span className="text-xs font-normal text-slate-500">({selectedClasses.length} selected)</span>
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedClasses([...INITIAL_CLASSES])}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
              >
                Select All
              </button>
              <span className="text-slate-300">|</span>
              <button
                onClick={() => setSelectedClasses(['Class IV'])}
                className="text-xs text-slate-500 hover:text-slate-700 font-semibold"
              >
                Reset
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {INITIAL_CLASSES.map(cls => {
              const isSelected = selectedClasses.includes(cls);
              return (
                <button
                  key={cls}
                  onClick={() => {
                    if (isSelected) {
                      if (selectedClasses.length > 1) {
                        setSelectedClasses(selectedClasses.filter(c => c !== cls));
                      }
                    } else {
                      setSelectedClasses([...selectedClasses, cls].sort((a, b) => INITIAL_CLASSES.indexOf(a) - INITIAL_CLASSES.indexOf(b)));
                    }
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isSelected 
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-200 scale-[1.02]' 
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {cls}
                </button>
              );
            })}
          </div>
        </div>

        {/* Teacher Name & Subject & Page Density */}
        <div className="lg:col-span-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <User size={15} className="text-blue-600" />
              Teacher Name <span className="text-red-500">*</span>
            </label>
            <input 
              type="text"
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm font-medium"
              placeholder="e.g. Sir Muhammad Hamza / Madam Fatima"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <BookOpen size={15} className="text-blue-600" />
                Subject
              </label>
              <select 
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-medium"
                value={selectedSubjectName}
                onChange={(e) => setSelectedSubjectName(e.target.value)}
              >
                {availableSubjects.map(subName => (
                  <option key={subName} value={subName}>{subName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Printer size={15} className="text-blue-600" />
                Students Per Page (A4)
              </label>
              <select 
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-medium"
                value={studentsPerPage}
                onChange={(e) => setStudentsPerPage(Number(e.target.value))}
              >
                <option value={16}>16 Students (Spacious)</option>
                <option value={18}>18 Students (Standard)</option>
                <option value={20}>20 Students (Optimal A4 Full Page)</option>
                <option value={22}>22 Students (Compact)</option>
                <option value={25}>25 Students (High Density)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Nature of Test Keys Info & Quick Preset */}
        <div className="lg:col-span-6 bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-black">Nature of Test Keys Guide</span>
              <span className="text-[11px] bg-black text-white px-2 py-0.5 rounded font-bold">Max Marks: 10</span>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3">
              <div className="bg-white p-2 rounded-lg border-2 border-black shadow-xs">
                <span className="block font-black text-base text-black">O</span>
                <span className="text-black font-semibold">Oral Test</span>
              </div>
              <div className="bg-white p-2 rounded-lg border-2 border-black shadow-xs">
                <span className="block font-black text-base text-black">W</span>
                <span className="text-black font-semibold">Written Test</span>
              </div>
              <div className="bg-white p-2 rounded-lg border-2 border-black shadow-xs">
                <span className="block font-black text-base text-black">B</span>
                <span className="text-black font-semibold">Board Test</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-black uppercase tracking-wide mb-1.5">Apply Quick Test Pattern to All 9 Days:</label>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => handleSetAllNature('O')}
                className="px-2.5 py-1 bg-white border border-black hover:bg-black hover:text-white text-black rounded-lg text-xs font-bold transition-colors"
              >
                All Oral (O)
              </button>
              <button 
                onClick={() => handleSetAllNature('W')}
                className="px-2.5 py-1 bg-white border border-black hover:bg-black hover:text-white text-black rounded-lg text-xs font-bold transition-colors"
              >
                All Written (W)
              </button>
              <button 
                onClick={() => handleSetAllNature('B')}
                className="px-2.5 py-1 bg-white border border-black hover:bg-black hover:text-white text-black rounded-lg text-xs font-bold transition-colors"
              >
                All Board Test (B)
              </button>
            </div>
          </div>
        </div>

        {/* 9 Column Quick Customizer */}
        <div className="lg:col-span-12">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-gray-800">Customize Nature of Test for Each of the 9 Execution Days</span>
            <span className="text-xs text-gray-500">Click O, W, or B for any specific day column</span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2">
            {columnsConfig.map((col, idx) => (
              <div 
                key={col.dayNumber}
                className="bg-white p-2.5 rounded-xl border border-gray-200 text-center shadow-2xs hover:border-black transition-all"
              >
                <span className="block text-[11px] font-bold text-black uppercase mb-1">Day {col.dayNumber}</span>
                <div className="flex justify-center gap-1">
                  {(['O', 'W', 'B'] as NatureOfTestKey[]).map(key => (
                    <button
                      key={key}
                      onClick={() => handleNatureChange(idx, key)}
                      className={`w-7 h-7 rounded-lg text-xs font-extrabold transition-all ${
                        col.natureOfTest === key
                          ? 'bg-black text-white shadow-xs' 
                          : 'bg-gray-100 text-black hover:bg-gray-200'
                      }`}
                    >
                      {key}
                    </button>
                  ))}
                </div>
                <div className="mt-1.5 text-[10px] text-gray-600 font-mono">Max: 10</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Download Banner */}
      <div className="flex flex-wrap justify-between items-center bg-slate-900 text-white p-5 rounded-2xl shadow-lg shadow-slate-950/10 mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-slate-800 rounded-full text-xs font-bold uppercase tracking-wider text-slate-200">
              {selectedClasses.length} {selectedClasses.length === 1 ? 'Class' : 'Classes'} Ready
            </span>
            <span className="text-xs text-slate-300">• Subject: <strong>{selectedSubjectName}</strong></span>
            <span className="text-xs text-slate-300">• Format: <strong>A4 Portrait (B&W Print Ready)</strong></span>
          </div>
          <h3 className="text-base font-bold mt-1">Ready to Generate Final Reinforcement PDF</h3>
          <p className="text-xs text-slate-300/90">
            Fills the complete A4 portrait page with 100% crisp solid black lines and typography, specifically optimized for high-clarity black & white printing.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleDownloadPDF}
            disabled={isGenerating || selectedClasses.length === 0}
            className="flex items-center gap-2 bg-white text-slate-950 hover:bg-slate-100 px-6 py-3 rounded-xl font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? <Loader2 size={18} className="animate-spin text-slate-900" /> : <Download size={18} className="text-slate-900" />}
            <span>{isGenerating ? 'Generating PDF...' : 'Download Final PDF (A4 Portrait)'}</span>
          </button>
        </div>
      </div>

      {/* Live Preview Table Matching The Black & White Sample Image */}
      <div className="border border-gray-300 rounded-2xl overflow-hidden shadow-sm bg-white">
        <div className="bg-slate-100 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-black">On-Screen Preview (A4 Portrait Layout):</span>
            <span className="text-xs font-bold text-black bg-white px-2.5 py-1 rounded-md border border-black">
              {currentPreviewClass} ({currentPreviewStudents.length} Students)
            </span>
          </div>
          <span className="text-xs text-black font-semibold">High-contrast Black & White Printer Ready</span>
        </div>

        <div className="overflow-x-auto p-4 bg-slate-100 flex justify-center">
          <div className="bg-white border-2 border-black p-5 rounded shadow-md w-full max-w-3xl font-serif text-black">
            {/* Institution Banner in Pure Black */}
            <div className="text-center mb-2">
              <div className="text-sm font-black tracking-wide uppercase text-black">
                DAR-UL-MADINAH INTERNATIONAL ISLAMIC SCHOOL SYSTEM
              </div>
              <div className="text-[11px] italic text-black">
                Dawat-e-Islami
              </div>
            </div>

            {/* Header Layout from Sample Image */}
            <div className="flex justify-between items-start mb-2.5">
              <div>
                <h2 className="text-lg font-black text-black leading-tight">Students’ Reinforcement Record</h2>
                <div className="mt-1 text-xs font-bold text-black flex items-center gap-2">
                  <span>Teacher Name:</span>
                  <span className="border-b-2 border-black min-w-[180px] inline-block font-sans font-bold text-black px-1">
                    {teacherName || '_______________________'}
                  </span>
                </div>
                <div className="text-xs font-bold text-black mt-1">
                  <span>Class: <strong className="text-black font-sans">{currentPreviewClass.replace('Class ', '')}</strong></span>
                  <span className="mx-2">•</span>
                  <span>Subject: <strong className="text-black font-sans">{selectedSubjectName}</strong></span>
                </div>
              </div>

              {/* Nature of Test Box (Top Right as in Sample) */}
              <div className="border-2 border-black p-1.5 text-center bg-white min-w-[240px]">
                <div className="font-bold text-xs text-black border-b border-black pb-0.5 mb-0.5">Nature of Test</div>
                <div className="text-[11px] font-bold text-black">
                  Keys: <strong>O</strong>=Oral , <strong>W</strong>=Written , <strong>B</strong>=Board Test
                </div>
              </div>
            </div>

            {/* Table Grid */}
            <table className="w-full border-collapse border-2 border-black text-xs text-black">
              <thead>
                {/* Meta Row 1: Date */}
                <tr className="bg-gray-100">
                  <th colSpan={3} className="border border-black px-2 py-1 text-center font-bold">Date</th>
                  {columnsConfig.map((col) => (
                    <th key={`date-${col.dayNumber}`} className="border border-black px-0.5 py-1 text-center font-mono text-[10px] text-black font-normal">
                      {col.date || '___/___'}
                    </th>
                  ))}
                </tr>
                {/* Meta Row 2: Subject */}
                <tr>
                  <th colSpan={3} className="border border-black px-2 py-1 text-center font-bold">Subject</th>
                  {columnsConfig.map((col) => (
                    <th key={`subj-${col.dayNumber}`} className="border border-black px-0.5 py-1 text-center font-bold text-[10px] truncate max-w-[45px]">
                      {col.subject || selectedSubjectName}
                    </th>
                  ))}
                </tr>
                {/* Meta Row 3: Nature of Test */}
                <tr className="bg-gray-100">
                  <th colSpan={3} className="border border-black px-2 py-1 text-center font-bold">Nature of Test</th>
                  {columnsConfig.map((col) => (
                    <th key={`nat-${col.dayNumber}`} className="border border-black px-0.5 py-1 text-center font-black text-xs text-black">
                      {col.natureOfTest}
                    </th>
                  ))}
                </tr>
                {/* Meta Row 4: Max Marks */}
                <tr>
                  <th colSpan={3} className="border border-black px-2 py-1 text-center font-bold">Max. Marks</th>
                  {columnsConfig.map((col) => (
                    <th key={`max-${col.dayNumber}`} className="border border-black px-0.5 py-1 text-center font-bold text-xs text-black">
                      {col.maxMarks}
                    </th>
                  ))}
                </tr>
                {/* Main Header Row */}
                <tr className="bg-gray-200 font-bold">
                  <th className="border border-black px-1.5 py-1 text-center w-8">S.N</th>
                  <th className="border border-black px-1.5 py-1 text-center w-12">GR No</th>
                  <th className="border border-black px-2 py-1 text-left">Student Name</th>
                  {columnsConfig.map((col) => (
                    <th key={`header-${col.dayNumber}`} className="border border-black px-0.5 py-1 text-center w-9">
                      {col.dayNumber}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentPreviewStudents.slice(0, 10).map((s, i) => (
                  <tr key={s.id}>
                    <td className="border border-black px-1 py-1 text-center font-sans font-medium">{i + 1}</td>
                    <td className="border border-black px-1 py-1 text-center font-sans text-black">{s.grNo}</td>
                    <td className="border border-black px-2 py-1 text-left font-sans">
                      <span className="font-bold text-black uppercase">{s.name}</span>
                      {s.fatherName && <span className="text-[10px] text-black uppercase block font-normal">{s.fatherName}</span>}
                    </td>
                    {columnsConfig.map((col) => (
                      <td key={`cell-${s.id}-${col.dayNumber}`} className="border border-black p-2 bg-white"></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            {currentPreviewStudents.length > 10 && (
              <div className="text-center text-xs text-black py-1.5 border-b border-l border-r border-black bg-gray-50 font-sans">
                + {currentPreviewStudents.length - 10} more students in {currentPreviewClass} (full class populated in generated PDF)
              </div>
            )}

            {/* Signature Footer */}
            <div className="flex justify-between items-center mt-3 pt-2 text-[11px] font-bold text-black border-t border-black">
              <div>Teacher Signature: __________________</div>
              <div>Principal Signature: __________________</div>
              <div>Date: __________________</div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Render Template For Pixel-Perfect A4 Portrait Full-Page Capture */}
      <div className="absolute left-[-9999px] top-[-9999px]">
        {selectedClasses.map((cls, idx) => {
          const students = data[cls] || [];
          const numPages = Math.max(1, Math.ceil(students.length / studentsPerPage));
          const chunks = students.length > 0 
            ? Array.from({ length: numPages }, (_, i) => students.slice(i * studentsPerPage, i * studentsPerPage + studentsPerPage)) 
            : [[]];

          return chunks.map((chunk, chunkIdx) => (
            <div 
              key={`reinforce-pdf-${cls}-${chunkIdx}`} 
              id={`reinforcement-pdf-page-${idx}-${chunkIdx}`} 
              style={{ 
                display: 'none', 
                width: '210mm', // Standard A4 Portrait Width
                height: '297mm', // Standard A4 Portrait Height
                padding: '8mm 9mm 8mm 9mm', 
                boxSizing: 'border-box', 
                backgroundColor: '#ffffff', 
                color: '#000000', 
                fontFamily: '"Times New Roman", Times, serif',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              {/* Header Box Group */}
              <div>
                {/* Institution Title Bar */}
                <div style={{ textAlign: 'center', marginBottom: '6px' }}>
                  <div style={{ fontSize: '15px', fontWeight: 'bold', letterSpacing: '0.5px', textTransform: 'uppercase', color: '#000000' }}>
                    DAR-UL-MADINAH INTERNATIONAL ISLAMIC SCHOOL SYSTEM
                  </div>
                  <div style={{ fontSize: '11px', color: '#000000', fontStyle: 'italic' }}>
                    Dawat-e-Islami
                  </div>
                </div>

                {/* Main Sample Header Box */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontSize: '17px', fontWeight: 'bold', color: '#000000', lineHeight: '1.2' }}>
                      Students’ Reinforcement Record
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#000000', marginTop: '3px' }}>
                      Teacher Name: <span style={{ textDecoration: 'underline', paddingLeft: '6px', paddingRight: '15px', fontFamily: 'Arial, sans-serif' }}>{teacherName}</span>
                    </div>
                    <div style={{ fontSize: '11.5px', fontWeight: 'bold', color: '#000000', marginTop: '2px' }}>
                      Class: <span style={{ fontFamily: 'Arial, sans-serif', paddingRight: '12px' }}>{cls.replace('Class ', '')}</span>
                      Subject: <span style={{ fontFamily: 'Arial, sans-serif' }}>{selectedSubjectName}</span>
                      {chunks.length > 1 && <span style={{ paddingLeft: '12px', color: '#000000' }}>(Page {chunkIdx + 1}/{chunks.length})</span>}
                    </div>
                  </div>

                  {/* Nature of Test Key Box as per sample image */}
                  <div style={{ border: '2px solid #000000', padding: '4px 8px', textAlign: 'center', backgroundColor: '#ffffff', minWidth: '235px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', borderBottom: '1.5px solid #000000', paddingBottom: '2px', marginBottom: '2px', color: '#000000' }}>
                      Nature of Test
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#000000' }}>
                      Keys: <strong>O</strong>=Oral , <strong>W</strong>=Written , <strong>B</strong>=Board Test
                    </div>
                  </div>
                </div>

                {/* Table Grid matching sample format in pure Black & White */}
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #000000', fontSize: '11px', textAlign: 'center', color: '#000000' }}>
                  <thead>
                    {/* Meta 1: Date */}
                    <tr style={{ backgroundColor: '#f0f0f0' }}>
                      <th colSpan={3} style={{ border: '1.5px solid #000000', padding: '3.5px 4px', fontWeight: 'bold', width: '38%', color: '#000000' }}>Date</th>
                      {columnsConfig.map((col) => (
                        <th key={`pdf-date-${col.dayNumber}`} style={{ border: '1.5px solid #000000', padding: '3.5px 1px', width: '6.88%', fontSize: '10px', color: '#000000', fontWeight: 'normal', fontFamily: 'Arial, sans-serif' }}>
                          {col.date || '___/___'}
                        </th>
                      ))}
                    </tr>

                    {/* Meta 2: Subject */}
                    <tr>
                      <th colSpan={3} style={{ border: '1.5px solid #000000', padding: '3.5px 4px', fontWeight: 'bold', color: '#000000' }}>Subject</th>
                      {columnsConfig.map((col) => (
                        <th key={`pdf-subj-${col.dayNumber}`} style={{ border: '1.5px solid #000000', padding: '3.5px 1px', fontWeight: 'bold', fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#000000' }}>
                          {col.subject || selectedSubjectName}
                        </th>
                      ))}
                    </tr>

                    {/* Meta 3: Nature of Test */}
                    <tr style={{ backgroundColor: '#f0f0f0' }}>
                      <th colSpan={3} style={{ border: '1.5px solid #000000', padding: '3.5px 4px', fontWeight: 'bold', color: '#000000' }}>Nature of Test</th>
                      {columnsConfig.map((col) => (
                        <th key={`pdf-nature-${col.dayNumber}`} style={{ border: '1.5px solid #000000', padding: '3.5px 1px', fontWeight: 'bold', fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#000000' }}>
                          {col.natureOfTest}
                        </th>
                      ))}
                    </tr>

                    {/* Meta 4: Max Marks */}
                    <tr>
                      <th colSpan={3} style={{ border: '1.5px solid #000000', padding: '3.5px 4px', fontWeight: 'bold', color: '#000000' }}>Max. Marks</th>
                      {columnsConfig.map((col) => (
                        <th key={`pdf-max-${col.dayNumber}`} style={{ border: '1.5px solid #000000', padding: '3.5px 1px', fontWeight: 'bold', fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#000000' }}>
                          {col.maxMarks}
                        </th>
                      ))}
                    </tr>

                    {/* Header Row */}
                    <tr style={{ backgroundColor: '#e2e2e2', fontWeight: 'bold' }}>
                      <th style={{ border: '1.5px solid #000000', padding: '4px 2px', width: '5%', color: '#000000' }}>S.N</th>
                      <th style={{ border: '1.5px solid #000000', padding: '4px 2px', width: '7%', color: '#000000' }}>GR No</th>
                      <th style={{ border: '1.5px solid #000000', padding: '4px 4px', textAlign: 'left', width: '26%', color: '#000000' }}>Student Name</th>
                      {columnsConfig.map((col) => (
                        <th key={`pdf-head-${col.dayNumber}`} style={{ border: '1.5px solid #000000', padding: '4px 1px', width: '6.88%', color: '#000000' }}>
                          {col.dayNumber}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {chunk.map((s, i) => {
                      const absoluteIndex = chunkIdx * studentsPerPage + i;
                      return (
                        <tr key={`pdf-row-${s.id}`}>
                          <td style={{ border: '1px solid #000000', padding: '5.5px 1px', textAlign: 'center', fontFamily: 'Arial, sans-serif', fontSize: '10.5px', color: '#000000' }}>
                            {absoluteIndex + 1}
                          </td>
                          <td style={{ border: '1px solid #000000', padding: '5.5px 1px', textAlign: 'center', fontFamily: 'Arial, sans-serif', color: '#000000', fontSize: '10px' }}>
                            {s.grNo}
                          </td>
                          <td style={{ border: '1px solid #000000', padding: '5.5px 4px', textAlign: 'left', fontFamily: 'Arial, sans-serif' }}>
                            <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '10.5px', color: '#000000', lineHeight: '1.1' }}>{s.name}</div>
                            {s.fatherName && <div style={{ fontSize: '8.5px', textTransform: 'uppercase', color: '#000000', opacity: 0.9 }}>{s.fatherName}</div>}
                          </td>
                          {columnsConfig.map((col) => (
                            <td key={`pdf-cell-${s.id}-${col.dayNumber}`} style={{ border: '1px solid #000000', padding: '5.5px 1px', backgroundColor: '#ffffff' }}></td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Signatures & Footer info at bottom of A4 page */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', paddingTop: '6px', fontSize: '11px', fontWeight: 'bold', borderTop: '1px solid #000000', color: '#000000' }}>
                <div>Teacher Signature: ______________________</div>
                <div>Principal / Incharge Signature: ______________________</div>
                <div>Date: ______________________</div>
              </div>
            </div>
          ));
        })}
      </div>
    </div>
  );
}
