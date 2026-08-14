import React, { useState, useEffect, useRef } from 'react';
import { ClassName, Student, Subject } from '../../types/marksheet';
import { DEFAULT_CLASS_SUBJECTS, INITIAL_CLASSES } from '../../data/marksheetData';
import { INITIAL_STUDENTS } from '../../data/initialStudents';
import { Save, Printer, Plus, Trash2, Edit2, UploadCloud, CheckCircle2, Settings, Users, BookOpen } from 'lucide-react';
import { generatePrintHTML } from './PrintTemplate';

const STORAGE_KEY = 'marksheet_data_v2';
const SCRIPT_URL_KEY = 'marksheet_script_url';
const SUBJECT_CONFIG_KEY = 'marksheet_subjects_v2';

export default function MarksheetManager() {
  const [activeClass, setActiveClass] = useState<ClassName>('Class IV');
  
  // Custom Subjects config (stores max marks)
  const [subjectsConfig, setSubjectsConfig] = useState<Record<ClassName, Subject[]>>(() => {
    const saved = localStorage.getItem(SUBJECT_CONFIG_KEY);
    if (saved) return JSON.parse(saved);
    return DEFAULT_CLASS_SUBJECTS;
  });

  const [data, setData] = useState<Record<ClassName, Student[]>>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
    return INITIAL_STUDENTS;
  });
  
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [scriptUrl, setScriptUrl] = useState<string>(() => localStorage.getItem(SCRIPT_URL_KEY) || '');
  const [showSettings, setShowSettings] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Triple Click Logic
  const [headingClicks, setHeadingClicks] = useState(0);
  const [showMaxMarksConfig, setShowMaxMarksConfig] = useState(false);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Entry Mode Logic
  const [entryMode, setEntryMode] = useState<'student' | 'subject'>('student');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');

  // Edit State (for student-wise)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Student>>({});

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    localStorage.setItem(SUBJECT_CONFIG_KEY, JSON.stringify(subjectsConfig));
  }, [subjectsConfig]);

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
      setEditForm(newStudent);
    }
    setData(prev => ({
      ...prev,
      [activeClass]: [...prev[activeClass], newStudent]
    }));
  };

  const handleSaveEdit = () => {
    setData(prev => ({
      ...prev,
      [activeClass]: prev[activeClass].map(s => s.id === editingId ? { ...s, ...editForm } as Student : s)
    }));
    setEditingId(null);
    setEditForm({});
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

    const printHtml = generatePrintHTML(studentsToPrint, currentSubjects, activeClass);
    
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

  const handleSync = async () => {
    if (!scriptUrl) {
      setShowSettings(true);
      alert('Please set your Google Apps Script Web App URL first.');
      return;
    }

    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const exportData = {
        className: activeClass,
        subjects: currentSubjects.map(s => s.name),
        students: currentStudents.map(s => ({
          grNo: s.grNo,
          name: s.name,
          fatherName: s.fatherName,
          marks: currentSubjects.map(sub => Number(s.marks[sub.id]) || 0),
          total: calculateTotal(s.marks, currentSubjects),
          percentage: calculatePercentage(s.marks, currentSubjects)
        }))
      };

      await fetch(scriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportData)
      });
      
      setSyncStatus('Data synced successfully!');
      setTimeout(() => setSyncStatus(null), 3000);
    } catch (e) {
      console.error(e);
      setSyncStatus('Sync failed. Please check the URL and your network.');
    } finally {
      setIsSyncing(false);
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
          <h2 
            onClick={handleHeadingClick}
            className="text-2xl font-bold text-gray-800 cursor-pointer select-none"
            title="Click 3 times to configure Max Marks"
          >
            Marksheet Management
          </h2>
          <p className="text-gray-500 text-sm mt-1">Dar-ul-Madinah Gulshan BHS - Consolidated Award List</p>
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
            onClick={() => setShowSettings(!showSettings)}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <Settings size={16} />
          </button>
          <button 
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
          >
            {isSyncing ? <span className="animate-spin text-lg">↻</span> : <UploadCloud size={16} />}
            Sync
          </button>
          <div className="flex gap-2">
            <button 
              onClick={() => handlePrint('all')}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
            >
              <Printer size={16} /> Print All
            </button>
            <button 
              onClick={() => handlePrint('selected')}
              disabled={selectedStudents.size === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 disabled:opacity-50"
            >
              <Printer size={16} /> Print ({selectedStudents.size})
            </button>
          </div>
        </div>
      </div>

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

      {showSettings && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="font-semibold text-gray-700 mb-2">Google Sheets Sync Configuration</h3>
          <p className="text-sm text-gray-500 mb-4">
            Enter your Google Apps Script Web App URL below. The script should be configured to accept POST requests with JSON payload containing student marks.
          </p>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={scriptUrl}
              onChange={(e) => {
                setScriptUrl(e.target.value);
                localStorage.setItem(SCRIPT_URL_KEY, e.target.value);
              }}
              placeholder="https://script.google.com/macros/s/AKfycb.../exec"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button onClick={() => setShowSettings(false)} className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700">
              Done
            </button>
          </div>
        </div>
      )}

      {syncStatus && (
        <div className="mb-6 p-3 bg-green-50 text-green-700 rounded-lg flex items-center gap-2">
          <CheckCircle2 size={18} />
          {syncStatus}
        </div>
      )}

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

      {/* Data Grid */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
            <tr>
              <th className="px-4 py-3 w-10 text-center">
                <input 
                  type="checkbox" 
                  checked={currentStudents.length > 0 && selectedStudents.size === currentStudents.length}
                  onChange={toggleSelectAll}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="px-4 py-3 font-semibold">GR No</th>
              <th className="px-4 py-3 font-semibold">Student Details</th>
              
              {entryMode === 'student' ? (
                <>
                  {currentSubjects.map(sub => (
                    <th key={sub.id} className="px-4 py-3 font-semibold text-center">{sub.name}</th>
                  ))}
                  <th className="px-4 py-3 font-semibold text-center bg-blue-50">Total</th>
                  <th className="px-4 py-3 font-semibold text-center bg-blue-50">%age</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </>
              ) : (
                <>
                  <th className="px-4 py-3 font-bold text-center bg-blue-100 text-blue-900 text-lg">
                    {currentSubjects.find(s => s.id === selectedSubjectId)?.name || 'Subject'} Marks
                  </th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {currentStudents.map((student, index) => {
              const isEditing = editingId === student.id;
              
              return (
                <tr key={student.id} className={`hover:bg-gray-50/50 ${isEditing ? 'bg-yellow-50' : ''}`}>
                  <td className="px-4 py-3 text-center">
                    <input 
                      type="checkbox" 
                      checked={selectedStudents.has(student.id)}
                      onChange={() => toggleSelect(student.id)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={editForm.grNo || ''} 
                        onChange={e => setEditForm({...editForm, grNo: e.target.value})}
                        className="w-16 px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500"
                        placeholder="GR"
                      />
                    ) : (
                      <span className="font-medium text-gray-700">{student.grNo}</span>
                    )}
                  </td>
                  
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <div className="flex flex-col gap-1">
                        <input 
                          type="text" 
                          value={editForm.name || ''} 
                          onChange={e => setEditForm({...editForm, name: e.target.value.toUpperCase()})}
                          className="w-48 px-2 py-1 border rounded uppercase text-xs focus:ring-2 focus:ring-blue-500"
                          placeholder="Student Name"
                        />
                        <input 
                          type="text" 
                          value={editForm.fatherName || ''} 
                          onChange={e => setEditForm({...editForm, fatherName: e.target.value.toUpperCase()})}
                          className="w-48 px-2 py-1 border rounded uppercase text-xs focus:ring-2 focus:ring-blue-500"
                          placeholder="Father Name"
                        />
                      </div>
                    ) : (
                      <div>
                        <div className="font-bold text-gray-800 uppercase">{student.name}</div>
                        <div className="text-xs text-gray-500 uppercase">{student.fatherName}</div>
                      </div>
                    )}
                  </td>
                  
                  {entryMode === 'student' ? (
                    <>
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
                    </>
                  ) : (
                    <>
                      {/* Subject-Wise Entry Column */}
                      <td className="px-4 py-3 text-center bg-blue-50">
                        <input 
                          type="number" 
                          min="0"
                          max={currentSubjects.find(s => s.id === selectedSubjectId)?.maxMarks || 100}
                          value={student.marks[selectedSubjectId] ?? ''} 
                          onChange={e => handleSubjectMarkUpdate(student.id, e.target.value)}
                          className="w-24 px-3 py-2 border-2 border-blue-200 rounded-lg text-center font-bold text-lg focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none bg-white"
                          placeholder="-"
                        />
                      </td>
                    </>
                  )}
                  
                  <td className="px-4 py-3 text-right">
                    {isEditing ? (
                      <button onClick={handleSaveEdit} className="text-green-600 hover:text-green-800 p-2 bg-green-50 rounded-lg">
                        <Save size={18} />
                      </button>
                    ) : (
                      <div className="flex justify-end gap-2">
                        {entryMode === 'student' && (
                          <button 
                            onClick={() => {
                              setEditingId(student.id);
                              setEditForm(student);
                            }} 
                            className="text-blue-600 hover:text-blue-800 p-1.5 bg-blue-50 rounded-md"
                            title="Edit Student Data & All Marks"
                          >
                            <Edit2 size={16} />
                          </button>
                        )}
                        <button 
                          onClick={() => handleDelete(student.id)} 
                          className="text-red-500 hover:text-red-700 p-1.5 bg-red-50 rounded-md"
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
                <td colSpan={entryMode === 'student' ? currentSubjects.length + 6 : 5} className="px-4 py-12 text-center text-gray-500">
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
