import React, { useState, useEffect, useRef } from 'react';
import { ClassName, Student, Subject } from '../../types/marksheet';
import { DEFAULT_CLASS_SUBJECTS, INITIAL_CLASSES } from '../../data/marksheetData';
import { INITIAL_STUDENTS } from '../../data/initialStudents';
import { Save, Printer, Plus, Trash2, Edit2, UploadCloud, CheckCircle2, Users, BookOpen, Download } from 'lucide-react';
import { generatePrintHTML } from './PrintTemplate';
import { db, doc, onSnapshot, setDoc } from '../../firebase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const STORAGE_KEY = 'marksheet_data_v2';
const SUBJECT_CONFIG_KEY = 'marksheet_subjects_v2';

export default function MarksheetManager() {
  const [activeClass, setActiveClass] = useState<ClassName>('Class IV');
  
  // Custom Subjects config (stores max marks)
  const [_subjectsConfig, _setSubjectsConfig] = useState<Record<ClassName, Subject[]>>(() => {
    const saved = localStorage.getItem(SUBJECT_CONFIG_KEY);
    if (saved) return JSON.parse(saved);
    return DEFAULT_CLASS_SUBJECTS;
  });

  const [_data, _setData] = useState<Record<ClassName, Student[]>>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
    return INITIAL_STUDENTS;
  });

  const setData = (updater: any) => {
    _setData((prev: Record<ClassName, Student[]>) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      setDoc(doc(db, 'marksheets', 'studentsData'), { ...next }).catch(console.error);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const setSubjectsConfig = (updater: any) => {
    _setSubjectsConfig((prev: Record<ClassName, Subject[]>) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      setDoc(doc(db, 'marksheets', 'subjectsConfig'), { ...next }).catch(console.error);
      localStorage.setItem(SUBJECT_CONFIG_KEY, JSON.stringify(next));
      return next;
    });
  };

  const subjectsConfig = _subjectsConfig;
  const data = _data;

  useEffect(() => {
    // Listen to Firebase and sync
    const unsubData = onSnapshot(doc(db, 'marksheets', 'studentsData'), (docSnap) => {
      if (docSnap.exists()) {
        const firestoreData = docSnap.data() as Record<ClassName, Student[]>;
        _setData(firestoreData);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(firestoreData));
      } else {
        // Initial setup from local storage if firestore is empty
        const saved = localStorage.getItem(STORAGE_KEY);
        const initial = saved ? JSON.parse(saved) : INITIAL_STUDENTS;
        setDoc(doc(db, 'marksheets', 'studentsData'), { ...initial });
      }
    });

    const unsubSubj = onSnapshot(doc(db, 'marksheets', 'subjectsConfig'), (docSnap) => {
      if (docSnap.exists()) {
        const firestoreConfig = docSnap.data() as Record<ClassName, Subject[]>;
        _setSubjectsConfig(firestoreConfig);
        localStorage.setItem(SUBJECT_CONFIG_KEY, JSON.stringify(firestoreConfig));
      } else {
        const saved = localStorage.getItem(SUBJECT_CONFIG_KEY);
        const initial = saved ? JSON.parse(saved) : DEFAULT_CLASS_SUBJECTS;
        setDoc(doc(db, 'marksheets', 'subjectsConfig'), { ...initial });
      }
    });

    return () => {
      unsubData();
      unsubSubj();
    };
  }, []);
  
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadClass, setUploadClass] = useState<ClassName>('Class IV');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Triple Click Logic
  const [headingClicks, setHeadingClicks] = useState(0);
  const [showMaxMarksConfig, setShowMaxMarksConfig] = useState(false);
  const [autoSign, setAutoSign] = useState(false);
  const [showGrOnPrint, setShowGrOnPrint] = useState(false);
  const [showUploadedMarksOnConsolidated, setShowUploadedMarksOnConsolidated] = useState(false);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Entry Mode Logic
  const [entryMode, setEntryMode] = useState<'student' | 'subject'>('student');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');

  // Edit State (for student-wise)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [coreEditId, setCoreEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Student>>({});

  const stateRefs = useRef({ editingId, editForm, activeClass, coreEditId });
  useEffect(() => {
    stateRefs.current = { editingId, editForm, activeClass, coreEditId };
  }, [editingId, editForm, activeClass, coreEditId]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.student-row') && !target.closest('.action-btn')) {
        const { editingId: currentId, editForm: currentForm, activeClass: currClass } = stateRefs.current;
        if (currentId) {
          setData((prev: Record<ClassName, Student[]>) => ({
            ...prev,
            [currClass]: prev[currClass].map(s => s.id === currentId ? { ...s, ...currentForm } as Student : s)
          }));
          setEditingId(null);
          setCoreEditId(null);
          setEditForm({});
        }
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      const { editingId: currentId, editForm: currentForm, activeClass: currClass } = stateRefs.current;
      if (currentId) {
        const saved = localStorage.getItem(STORAGE_KEY);
        let parsed = saved ? JSON.parse(saved) : INITIAL_STUDENTS;
        if (parsed[currClass]) {
          parsed[currClass] = parsed[currClass].map((s: Student) => s.id === currentId ? { ...s, ...currentForm } as Student : s);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
          setDoc(doc(db, 'marksheets', 'studentsData'), { ...parsed }).catch(console.error);
        }
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const currentSubjects = subjectsConfig[activeClass] || DEFAULT_CLASS_SUBJECTS[activeClass];
  const currentStudents = data[activeClass] || [];

  // When class changes, reset selected subject if not valid
  useEffect(() => {
    if (entryMode === 'subject' && currentSubjects.length > 0) {
      if (!currentSubjects.find(s => s.id === selectedSubjectId)) {
        setSelectedSubjectId(currentSubjects[0].id);
      }
    }
  }, [activeClass, currentSubjects, entryMode, selectedSubjectId]);

  const handleHeadingClick = () => {
    setHeadingClicks(prev => {
      const next = prev + 1;
      if (next >= 3) {
        setShowMaxMarksConfig(true);
        return 0;
      }
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = setTimeout(() => setHeadingClicks(0), 1000);
      return next;
    });
  };

  const handleAddStudent = () => {
    const newStudent: Student = {
      id: Date.now().toString(),
      sNo: currentStudents.length + 1,
      grNo: '',
      name: '',
      fatherName: '',
      marks: {}
    };
    
    if (entryMode === 'student') {
      setEditingId(newStudent.id);
      setCoreEditId(newStudent.id);
      setEditForm(newStudent);
    }
    setData(prev => ({
      ...prev,
      [activeClass]: [...prev[activeClass], newStudent]
    }));
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    setData(prev => ({
      ...prev,
      [activeClass]: prev[activeClass].map(s => s.id === editingId ? { ...s, ...editForm } as Student : s)
    }));
    setEditingId(null);
    setCoreEditId(null);
    setEditForm({});
  };

  const handleRowClick = (student: Student) => {
    if (entryMode !== 'student') return;
    if (editingId === student.id) return;

    if (editingId) {
      setData(prev => ({
        ...prev,
        [activeClass]: prev[activeClass].map(s => s.id === editingId ? { ...s, ...editForm } as Student : s)
      }));
      setCoreEditId(null);
    }

    setEditingId(student.id);
    setEditForm(student);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this student?')) {
      setData(prev => ({
        ...prev,
        [activeClass]: prev[activeClass].filter(s => s.id !== id)
      }));
      const newSelected = new Set(selectedStudents);
      newSelected.delete(id);
      setSelectedStudents(newSelected);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedStudents);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedStudents(next);
  };

  const toggleSelectAll = () => {
    if (selectedStudents.size === currentStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(currentStudents.map(s => s.id)));
    }
  };

  const calculateTotal = (marks: Record<string, number>, subjects: Subject[]) => {
    return subjects.reduce((sum, sub) => sum + (Number(marks[sub.id]) || 0), 0);
  };

  const calculateMaxTotal = (subjects: Subject[]) => {
    return subjects.reduce((sum, sub) => sum + sub.maxMarks, 0);
  };

  const calculatePercentage = (marks: Record<string, number>, subjects: Subject[]) => {
    const total = calculateTotal(marks, subjects);
    const max = calculateMaxTotal(subjects);
    if (max === 0) return 0;
    return ((total / max) * 100).toFixed(2);
  };

  const handlePrint = (type: 'all' | 'selected') => {
    const studentsToPrint = type === 'all' 
      ? currentStudents 
      : currentStudents.filter(s => selectedStudents.has(s.id));
      
    if (studentsToPrint.length === 0) {
      alert('No students selected for printing.');
      return;
    }

    const printHtml = generatePrintHTML(studentsToPrint, currentSubjects, activeClass, autoSign, showGrOnPrint);
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printHtml);
      printWindow.document.close();
      
      printWindow.onload = () => {
        printWindow.document.title = `Dar-ul-Madinah_Marksheet_${activeClass.replace(/\s+/g, '_')}`;
        printWindow.focus();
        printWindow.print();
      };
    }
  };

  const handleDownloadConsolidated = () => {
    handleDownloadConsolidatedStrict();
  };

  const handleDownloadConsolidatedStrict = () => {
    const pdf = new jsPDF('l', 'mm', 'a4');
    
    const head = [
      [
        'S.No',
        'GR No',
        'Name',
        'Father Name',
        ...currentSubjects.map(s => `${s.name}\n(${s.maxMarks})`),
        'Total',
        '%'
      ]
    ];

    const allRows = currentStudents.map((s) => {
      const totalMarks = currentSubjects.reduce((sum, sub) => sum + (Number(s.marks[sub.id]) || 0), 0);
      const maxTotal = calculateMaxTotal(currentSubjects);
      const percentage = maxTotal > 0 ? ((totalMarks / maxTotal) * 100).toFixed(2) : '0.00';
      
      return [
        s.sNo,
        s.grNo || '-',
        s.name.toUpperCase(),
        s.fatherName.toUpperCase(),
        ...currentSubjects.map(sub => showUploadedMarksOnConsolidated ? (s.marks[sub.id] ?? '-') : '-'),
        showUploadedMarksOnConsolidated ? totalMarks : '-',
        showUploadedMarksOnConsolidated ? `${percentage}%` : '-'
      ];
    });

    const rowsPerPage = 15;
    const totalPages = Math.ceil(allRows.length / rowsPerPage) || 1;

    for (let i = 0; i < totalPages; i++) {
      if (i > 0) pdf.addPage();
      
      // Crisp Black & White Header
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`Dar-ul-Madinah Gulshan BHS - Consolidated Award List`, 14, 12);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`Class: ${activeClass}  |  Session: 2025-2026  |  Page ${i + 1} of ${totalPages}  |  Black & White High-Contrast Print`, 14, 17);
      
      const chunk = allRows.slice(i * rowsPerPage, (i + 1) * rowsPerPage);
      
      autoTable(pdf, {
        head,
        body: chunk,
        startY: 20,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 2.8,
          textColor: [0, 0, 0],       // 100% Solid Black
          lineColor: [0, 0, 0],       // Solid Black Grid Lines (sharp & visible on paper)
          lineWidth: 0.25,
          font: 'helvetica'
        },
        headStyles: {
          fillColor: [230, 230, 230], // Light grey tone - preserves high contrast & saves toner
          textColor: [0, 0, 0],       // Bold Black Text
          fontStyle: 'bold',
          lineColor: [0, 0, 0],
          lineWidth: 0.35,
          halign: 'center'
        },
        alternateRowStyles: {
          fillColor: [255, 255, 255]  // Crisp pure white
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 12 },
          1: { halign: 'center', cellWidth: 16 },
          2: { halign: 'left', fontStyle: 'bold' },
          3: { halign: 'left' }
        },
        didParseCell: (data) => {
          if (data.section === 'body') {
            if (data.column.index >= 4) {
              data.cell.styles.halign = 'center';
            }
            // Bold Total and % columns
            if (data.column.index >= head[0].length - 2) {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.textColor = [0, 0, 0];
            }
          }
        },
        margin: { top: 20, bottom: 20 }
      });

      // Signatures at page bottom for official school records
      const pageHeight = pdf.internal.pageSize.getHeight();
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.5);
      pdf.setTextColor(0, 0, 0);
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.3);

      pdf.line(18, pageHeight - 11, 68, pageHeight - 11);
      pdf.text('Class Teacher Signature', 22, pageHeight - 7);

      pdf.line(124, pageHeight - 11, 174, pageHeight - 11);
      pdf.text('Exam Incharge Signature', 126, pageHeight - 7);

      pdf.line(228, pageHeight - 11, 278, pageHeight - 11);
      pdf.text('Principal Signature', 236, pageHeight - 7);
    }

    pdf.save(`Consolidated_Marksheet_${activeClass.replace(/\s+/g, '_')}.pdf`);
  };

  const handleSync = () => {
    setUploadClass(activeClass);
    setShowUploadModal(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSyncing(true);
    setSyncProgress(0);
    setSyncStatus(null);
    setShowUploadModal(false); // Close the modal if it is open
    
    // Start fake progress interval
    const progressInterval = setInterval(() => {
      setSyncProgress(prev => {
        if (prev >= 90) return prev;
        return prev + 5;
      });
    }, 600);
    
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const subjectsForUpload = subjectsConfig[uploadClass] || DEFAULT_CLASS_SUBJECTS[uploadClass] || [];
          
          const base64Data = (reader.result as string).split(',')[1];
          const response = await fetch('/api/extract-marks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pdfBase64: base64Data,
              subjects: subjectsForUpload.map(s => s.name)
            })
          });
          
          if (!response.ok) {
            let errorMsg = 'Failed to extract marks from PDF';
            try {
              const errJson = await response.json();
              if (errJson && errJson.error) errorMsg = errJson.error;
            } catch {
              try {
                const errText = await response.text();
                if (errText) errorMsg = errText;
              } catch {}
            }
            throw new Error(errorMsg);
          }
          
          setSyncProgress(100);
          const extractedDataRaw = await response.json();
          const extractedData = Array.isArray(extractedDataRaw) ? extractedDataRaw : [];
          
          if (extractedData.length === 0) {
            throw new Error("No marks extracted from the document (or format was unrecognized).");
          }
          
          setData((prev: Record<ClassName, Student[]>) => {
            const classData = [...(prev[uploadClass] || [])];
            let updatedCount = 0;
            
            extractedData.forEach((extractedStudent: any) => {
              const studentIndex = classData.findIndex(s => {
                const sGrNo = s.grNo ? String(s.grNo).trim().toLowerCase() : '';
                const exGrNo = extractedStudent.grNo ? String(extractedStudent.grNo).trim().toLowerCase() : '';
                
                const sName = s.name ? String(s.name).trim().toLowerCase() : '';
                const exName = extractedStudent.name ? String(extractedStudent.name).trim().toLowerCase() : '';
                
                return (sGrNo && exGrNo && sGrNo === exGrNo) || (sName && exName && sName === exName);
              });
              
              if (studentIndex !== -1) {
                const student = classData[studentIndex];
                const newMarks = { ...student.marks };
                
                subjectsForUpload.forEach(sub => {
                  // The AI might return the mark under exact subject name or slightly trimmed
                  const targetSubject = sub.name.trim().toLowerCase();
                  let foundMark = undefined;
                  
                  if (extractedStudent.marks) {
                    for (const key of Object.keys(extractedStudent.marks)) {
                      if (key.trim().toLowerCase() === targetSubject) {
                         foundMark = extractedStudent.marks[key];
                         break;
                      }
                    }
                  }
                  
                  if (foundMark !== undefined && foundMark !== null) {
                    const parsedMark = Number(foundMark);
                    if (!isNaN(parsedMark)) {
                      newMarks[sub.id] = parsedMark;
                    }
                  }
                });
                
                classData[studentIndex] = { ...student, marks: newMarks };
                updatedCount++;
              }
            });
            
            if (updatedCount === 0) {
              setSyncStatus(`Extraction complete, but no students matched in ${uploadClass}.`);
            } else {
              setSyncStatus(`Successfully synced marks for ${updatedCount} student(s) in ${uploadClass}!`);
            }
            return { ...prev, [uploadClass]: classData };
          });
          
          setTimeout(() => setSyncStatus(null), 4000);
        } catch (err: any) {
          console.error(err);
          setSyncStatus(`Failed to sync marks: ${err.message || 'Unknown error'}`);
        } finally {
          clearInterval(progressInterval);
          setTimeout(() => {
            setIsSyncing(false);
            setSyncProgress(0);
          }, 500);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      reader.readAsDataURL(file);
    } catch (e: any) {
      clearInterval(progressInterval);
      console.error(e);
      setSyncStatus(`Sync failed: ${e.message || 'Unknown error'}`);
      setIsSyncing(false);
      setSyncProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubjectMarkUpdate = (studentId: string, markValue: string) => {
    const num = Number(markValue);
    setData(prev => ({
      ...prev,
      [activeClass]: prev[activeClass].map(s => {
        if (s.id === studentId) {
          return { ...s, marks: { ...s.marks, [selectedSubjectId]: isNaN(num) ? 0 : num } };
        }
        return s;
      })
    }));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 
              onClick={handleHeadingClick}
              className="text-2xl font-bold text-gray-800 cursor-pointer select-none"
              title="Click 3 times to configure Max Marks"
            >
              Marksheet Management
            </h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold text-gray-900 bg-gray-100 border border-gray-400 rounded-full">
              <span className="w-2 h-2 rounded-full bg-black"></span>
              B&W Print Ready
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">Dar-ul-Madinah Gulshan BHS - Consolidated Award List & Student Marksheets</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button 
              onClick={() => setEntryMode('student')}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${entryMode === 'student' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Users size={16} /> Student-wise
            </button>
            <button 
              onClick={() => {
                setEntryMode('subject');
                if (!selectedSubjectId && currentSubjects.length > 0) {
                  setSelectedSubjectId(currentSubjects[0].id);
                }
              }}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${entryMode === 'subject' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <BookOpen size={16} /> Subject-wise
            </button>
          </div>
          
          <button 
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
          >
            {isSyncing ? <span className="animate-spin text-lg">↻</span> : <UploadCloud size={16} />}
            Upload Marks PDF
          </button>
          <div className="flex gap-2">
            <button 
              onClick={handleDownloadConsolidatedStrict}
              className="flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 shadow-sm"
              title="Download Consolidated Award List as high-contrast Black & White PDF"
            >
              <Download size={16} /> Consolidated (B&W PDF)
            </button>
            <button 
              onClick={() => handlePrint('all')}
              className="flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-white bg-gray-900 rounded-lg hover:bg-black shadow-sm"
              title="Print all student marksheets in high-contrast Black & White"
            >
              <Printer size={16} /> Print All (B&W)
            </button>
            <button 
              onClick={() => handlePrint('selected')}
              disabled={selectedStudents.size === 0}
              className="flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-gray-900 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              title="Print selected student marksheets in high-contrast Black & White"
            >
              <Printer size={16} /> Print Selected ({selectedStudents.size})
            </button>
          </div>
        </div>
      </div>

      {showUploadModal && (
        <div className="absolute top-0 left-0 right-0 bottom-0 z-50 bg-white/95 backdrop-blur flex items-center justify-center p-4">
          <div className="bg-white border shadow-2xl rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 text-blue-900">Upload PDF Marksheet</h3>
            <p className="text-sm text-gray-500 mb-6">Select the class this PDF belongs to, then choose the file to upload and extract marks.</p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Target Class</label>
              <select
                value={uploadClass}
                onChange={(e) => setUploadClass(e.target.value as ClassName)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {INITIAL_CLASSES.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <UploadCloud size={16} /> Select File
              </button>
            </div>
          </div>
        </div>
      )}

      {isSyncing && (
        <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur flex items-center justify-center p-4">
          <div className="bg-white border shadow-2xl rounded-2xl p-6 w-full max-w-sm text-center">
            <h3 className="text-xl font-bold mb-2 text-blue-900">Extracting Marks...</h3>
            <p className="text-sm text-gray-500 mb-6">Our AI is analyzing the document. This may take a moment.</p>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-2 overflow-hidden">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out" 
                style={{ width: `${syncProgress}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 text-right font-medium">{syncProgress}%</p>
          </div>
        </div>
      )}

      {showMaxMarksConfig && (
        <div className="absolute top-0 left-0 right-0 bottom-0 z-50 bg-white/95 backdrop-blur flex items-center justify-center p-4">
          <div className="bg-white border shadow-2xl rounded-2xl p-6 w-full max-w-lg">
            <h3 className="text-xl font-bold mb-4 text-blue-900">Configure Max Marks</h3>
            <p className="text-sm text-gray-500 mb-6">Set the maximum marks for subjects in <strong>{activeClass}</strong>.</p>
            
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
              {currentSubjects.map(sub => (
                <div key={sub.id} className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">{sub.name}</span>
                  <input 
                    type="number"
                    min="1"
                    className="w-24 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={sub.maxMarks}
                    onChange={(e) => {
                      const newMarks = Number(e.target.value);
                      setSubjectsConfig(prev => ({
                        ...prev,
                        [activeClass]: prev[activeClass].map(s => s.id === sub.id ? { ...s, maxMarks: newMarks } : s)
                      }));
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="autoSignCheckbox" 
                  checked={autoSign} 
                  onChange={(e) => setAutoSign(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <label htmlFor="autoSignCheckbox" className="text-sm text-gray-700 font-medium cursor-pointer">
                  Auto Sign Marksheet (Principal Signature)
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="showGrOnPrintCheckbox" 
                  checked={showGrOnPrint} 
                  onChange={(e) => setShowGrOnPrint(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <label htmlFor="showGrOnPrintCheckbox" className="text-sm text-gray-700 font-medium cursor-pointer">
                  Results with GR
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="showUploadedMarksOnConsolidatedCheckbox" 
                  checked={showUploadedMarksOnConsolidated} 
                  onChange={(e) => setShowUploadedMarksOnConsolidated(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <label htmlFor="showUploadedMarksOnConsolidatedCheckbox" className="text-sm text-gray-700 font-medium cursor-pointer">
                  Consolidated with Uploaded Marks
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-between items-center border-t pt-4">
              <button 
                onClick={() => {
                  const val = prompt("Enter max marks to apply to all subjects in this class:");
                  if (val && !isNaN(Number(val))) {
                    setSubjectsConfig(prev => ({
                      ...prev,
                      [activeClass]: prev[activeClass].map(s => ({ ...s, maxMarks: Number(val) }))
                    }));
                  }
                }}
                className="text-sm text-blue-600 font-medium hover:underline"
              >
                Set All to Same
              </button>
              <button 
                onClick={() => setShowMaxMarksConfig(false)}
                className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {syncStatus && (
        <div className="mb-6 p-3 bg-blue-50 text-blue-700 rounded-lg flex items-center gap-2">
          <CheckCircle2 size={18} />
          {syncStatus}
        </div>
      )}
      
      <input 
        type="file" 
        accept="application/pdf"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Class Selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {INITIAL_CLASSES.map(cls => (
          <button
            key={cls}
            onClick={() => {
              setActiveClass(cls);
              setSelectedStudents(new Set());
              setEditingId(null);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeClass === cls 
                ? 'bg-blue-600 text-white shadow' 
                : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
          >
            {cls}
          </button>
        ))}
      </div>

      {/* Subject Selector (Subject-wise Mode Only) */}
      {entryMode === 'subject' && currentSubjects.length > 0 && (
        <div className="mb-6 bg-blue-50 p-4 rounded-lg flex items-center gap-4">
          <label className="font-semibold text-blue-900">Select Subject for Data Entry:</label>
          <select 
            className="px-4 py-2 border border-blue-200 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
          >
            {currentSubjects.map(sub => (
              <option key={sub.id} value={sub.id}>{sub.name} (Max: {sub.maxMarks})</option>
            ))}
          </select>
        </div>
      )}

      {/* Data Area */}
      {entryMode === 'student' ? (
        <div className="overflow-x-auto overflow-y-auto max-h-[65vh] border border-gray-200 rounded-lg relative">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-600 sticky top-0 z-20 shadow-sm">
              <tr>
                <th className="px-1 md:px-2 py-3 text-center sticky left-0 top-0 z-30 bg-gray-50 w-[40px] min-w-[40px] md:w-[50px] md:min-w-[50px] border-b border-gray-200">
                  <input 
                    type="checkbox" 
                    checked={currentStudents.length > 0 && selectedStudents.size === currentStudents.length}
                    onChange={toggleSelectAll}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-2 md:px-4 py-3 font-semibold sticky left-[40px] md:left-[50px] top-0 z-30 bg-gray-50 w-[60px] min-w-[60px] md:w-[80px] md:min-w-[80px] border-b border-gray-200 text-xs md:text-sm">GR No</th>
                <th className="px-2 md:px-4 py-3 font-semibold sticky left-[100px] md:left-[130px] top-0 z-30 bg-gray-50 w-[140px] min-w-[140px] md:w-[240px] md:min-w-[240px] border-r-2 border-b border-gray-200 text-xs md:text-sm">Student Details</th>
                
                {currentSubjects.map(sub => (
                  <th key={sub.id} className="px-4 py-3 font-semibold text-center border-b border-gray-200">{sub.name}</th>
                ))}
                <th className="px-4 py-3 font-semibold text-center bg-blue-50 border-b border-gray-200">Total</th>
                <th className="px-4 py-3 font-semibold text-center bg-blue-50 border-b border-gray-200">%age</th>
                <th className="px-4 py-3 font-semibold text-right border-b border-gray-200">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentStudents.map((student, index) => {
                const isEditing = editingId === student.id;
                
                return (
                  <tr 
                    key={student.id} 
                    className={`student-row group ${isEditing ? 'bg-yellow-50' : 'hover:bg-gray-50'} cursor-pointer`}
                    onClick={() => handleRowClick(student)}
                  >
                    <td className={`px-1 md:px-2 py-3 text-center sticky left-0 z-10 w-[40px] min-w-[40px] md:w-[50px] md:min-w-[50px] ${isEditing ? 'bg-yellow-50' : 'bg-white group-hover:bg-gray-50'}`}>
                      <input 
                        type="checkbox" 
                        checked={selectedStudents.has(student.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelect(student.id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    
                    <td 
                      className={`px-2 md:px-4 py-3 sticky left-[40px] md:left-[50px] z-10 w-[60px] min-w-[60px] md:w-[80px] md:min-w-[80px] ${isEditing ? 'bg-yellow-50' : 'bg-white group-hover:bg-gray-50'}`}
                      onClick={(e) => {
                        if (e.detail >= 3) {
                          e.stopPropagation();
                          setCoreEditId(student.id);
                          if (editingId !== student.id) handleRowClick(student);
                        }
                      }}
                      title="Triple click to edit GR Number"
                    >
                      {isEditing && coreEditId === student.id ? (
                        <input 
                          type="text" 
                          value={editForm.grNo || ''} 
                          onChange={e => setEditForm({...editForm, grNo: e.target.value})}
                          className="w-full px-1 py-1 border rounded focus:ring-2 focus:ring-blue-500 text-xs"
                          placeholder="GR"
                        />
                      ) : (
                        <span className="font-medium text-gray-700 text-xs md:text-sm select-none">{student.grNo}</span>
                      )}
                    </td>
                    
                    <td 
                      className={`px-2 md:px-4 py-3 sticky left-[100px] md:left-[130px] z-10 w-[140px] min-w-[140px] md:w-[240px] md:min-w-[240px] border-r-2 border-gray-200 ${isEditing ? 'bg-yellow-50' : 'bg-white group-hover:bg-gray-50'}`}
                      onClick={(e) => {
                        if (e.detail >= 3) {
                          e.stopPropagation();
                          setCoreEditId(student.id);
                          if (editingId !== student.id) handleRowClick(student);
                        }
                      }}
                      title="Triple click to edit Name details"
                    >
                      {isEditing && coreEditId === student.id ? (
                        <div className="flex flex-col gap-1 w-full">
                          <input 
                            type="text" 
                            value={editForm.name || ''} 
                            onChange={e => setEditForm({...editForm, name: e.target.value.toUpperCase()})}
                            className="w-full px-2 py-1 border rounded uppercase text-xs focus:ring-2 focus:ring-blue-500"
                            placeholder="Student Name"
                          />
                          <input 
                            type="text" 
                            value={editForm.fatherName || ''} 
                            onChange={e => setEditForm({...editForm, fatherName: e.target.value.toUpperCase()})}
                            className="w-full px-2 py-1 border rounded uppercase text-xs focus:ring-2 focus:ring-blue-500"
                            placeholder="Father Name"
                          />
                        </div>
                      ) : (
                        <div className="w-full truncate whitespace-normal leading-tight select-none pointer-events-none">
                          <div className="font-bold text-gray-800 uppercase line-clamp-1 text-xs md:text-sm" title={student.name}>{student.name}</div>
                          <div className="text-[10px] md:text-xs text-gray-500 uppercase line-clamp-1" title={student.fatherName}>{student.fatherName}</div>
                        </div>
                      )}
                    </td>
                    
                    {currentSubjects.map(sub => (
                      <td key={sub.id} className="px-4 py-3 text-center">
                        {isEditing ? (
                          <input 
                            type="number" 
                            min="0"
                            max={sub.maxMarks}
                            value={editForm.marks?.[sub.id] ?? ''} 
                            onChange={e => setEditForm({
                              ...editForm, 
                              marks: { ...editForm.marks, [sub.id]: Number(e.target.value) }
                            })}
                            className="w-14 px-1 py-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        ) : (
                          <span className="font-medium text-gray-700">{student.marks[sub.id] ?? '-'}</span>
                        )}
                      </td>
                    ))}
                    
                    <td className="px-4 py-3 text-center font-bold text-gray-800 bg-blue-50/50">
                      {isEditing 
                        ? calculateTotal(editForm.marks || {}, currentSubjects)
                        : calculateTotal(student.marks, currentSubjects)}
                    </td>
                    
                    <td className="px-4 py-3 text-center font-bold text-indigo-600 bg-blue-50/50">
                      {isEditing 
                        ? calculatePercentage(editForm.marks || {}, currentSubjects)
                        : calculatePercentage(student.marks, currentSubjects)}%
                    </td>
                    
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <button onClick={(e) => { e.stopPropagation(); handleSaveEdit(); }} className="action-btn text-green-600 hover:text-green-800 p-2 bg-green-50 rounded-lg">
                          <Save size={18} />
                        </button>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRowClick(student);
                            }} 
                            className="action-btn text-blue-600 hover:text-blue-800 p-1.5 bg-blue-50 rounded-md"
                            title="Edit Student Data & All Marks"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(student.id);
                            }} 
                            className="action-btn text-red-500 hover:text-red-700 p-1.5 bg-red-50 rounded-md"
                            title="Delete Student"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              
              {currentStudents.length === 0 && !editingId && (
                <tr>
                  <td colSpan={currentSubjects.length + 6} className="px-4 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <Users size={32} className="text-gray-300" />
                      <p>No students added to {activeClass} yet.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col max-h-[65vh] overflow-y-auto pb-4 pr-1">
           <div className="flex justify-start items-center px-4 py-3 bg-blue-50 rounded-t-lg font-bold text-blue-900 sticky top-0 z-10 shadow-sm border border-blue-100 border-b-0">
             <div className="w-24 text-center text-sm md:text-base border-r border-blue-200 pr-4">Marks<br/><span className="text-xs font-semibold text-blue-600">Max: {currentSubjects.find(s => s.id === selectedSubjectId)?.maxMarks}</span></div>
             <div className="flex-1 text-left text-sm md:text-base pl-4">Student Details</div>
           </div>
           <div className="flex flex-col border border-gray-200 rounded-b-lg divide-y divide-gray-100">
             {currentStudents.map(student => (
               <div key={student.id} className="flex justify-start items-center px-4 py-3 bg-white hover:bg-gray-50 transition-colors">
                  <div className="w-24 text-center flex-shrink-0 border-r border-gray-100 pr-4 py-1">
                    <input 
                      type="number" 
                      min="0"
                      max={currentSubjects.find(s => s.id === selectedSubjectId)?.maxMarks || 100}
                      value={student.marks[selectedSubjectId] ?? ''} 
                      onChange={e => handleSubjectMarkUpdate(student.id, e.target.value)}
                      className="w-full px-2 py-3 border-2 border-blue-200 rounded-lg text-center font-bold text-xl md:text-2xl focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none bg-white text-blue-900 shadow-sm transition-all"
                      placeholder="-"
                    />
                  </div>
                  <div className="flex-1 flex flex-col items-start justify-center overflow-hidden pl-4">
                    <div className="font-bold text-gray-800 uppercase text-sm md:text-base whitespace-normal leading-tight text-left w-full" title={student.name}>{student.name}</div>
                    <div className="flex flex-wrap items-center justify-start gap-2 w-full mt-1">
                       <span className="bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 rounded text-[10px] font-bold shrink-0">GR: {student.grNo}</span>
                       <span className="text-xs text-gray-500 uppercase whitespace-normal leading-tight text-left" title={student.fatherName}>{student.fatherName}</span>
                    </div>
                  </div>
               </div>
             ))}
             {currentStudents.length === 0 && (
                <div className="px-4 py-12 text-center text-gray-500 bg-white">
                  <p>No students available. Switch to Student-wise mode to add students.</p>
                </div>
             )}
           </div>
        </div>
      )}
      
      <div className="mt-6 flex justify-between items-center">
        <button 
          onClick={handleAddStudent}
          disabled={editingId !== null || entryMode === 'subject'}
          title={entryMode === 'subject' ? "Switch to Student-wise mode to add new students" : "Add new student"}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-200"
        >
          <Plus size={18} />
          Add New Student
        </button>

        {entryMode === 'subject' && (
           <p className="text-sm text-blue-600 font-medium">Switch to Student-wise mode to edit core details or add students.</p>
        )}
      </div>
    </div>
  );
}
