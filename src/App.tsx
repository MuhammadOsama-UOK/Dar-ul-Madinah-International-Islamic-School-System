/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  FileText, 
  Download, 
  Loader2, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  CheckCircle2,
  ChevronRight,
  BookOpen,
  Calendar,
  User,
  Layers,
  LogOut,
  LogIn,
  Shield,
  Search,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  auth, 
  signInWithGoogle, 
  logout, 
  db, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  where, 
  Timestamp,
  doc,
  setDoc,
  handleFirestoreError,
  OperationType
} from './firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

// --- Types ---
interface LessonPlanData {
  teacherName: string;
  className: string;
  subject: string;
  month: string;
  week: string;
  day: string;
  topic: string;
  unitsRequired: string;
  date: string;
  medium: 'Urdu' | 'English';
  elos: string;
  resources: string;
  warmUpActivity: string;
  softSkills: string;
  deliveryProcedure: string;
  evaluation: string;
  homeWork: string;
  reflection: string;
  duration?: string;
}

const INITIAL_FORM: LessonPlanData = {
  teacherName: '',
  className: '',
  subject: '',
  month: '',
  week: '',
  day: '',
  topic: '',
  unitsRequired: '1',
  date: '',
  medium: 'Urdu',
  elos: '',
  resources: '',
  warmUpActivity: '',
  softSkills: '',
  deliveryProcedure: '',
  evaluation: '',
  homeWork: '',
  reflection: '',
};

// Error Boundary Component
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong.";
      try {
        const parsed = JSON.parse(this.state.error.message);
        if (parsed.error) errorMessage = parsed.error;
      } catch (e) {
        errorMessage = this.state.error.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
          <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-red-100">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Application Error</h2>
            <p className="text-gray-600 mb-6">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [formData, setFormData] = useState<LessonPlanData>(INITIAL_FORM);
  const [generatedPlan, setGeneratedPlan] = useState<LessonPlanData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [allPlans, setAllPlans] = useState<any[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [adminFilterClass, setAdminFilterClass] = useState('');
  const pdfRef = useRef<HTMLDivElement>(null);

  const ADMIN_EMAIL = "osamajafar5070@gmail.com";

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setIsLoadingAuth(false);
      if (user) {
        // Sync user to Firestore
        const userRef = doc(db, 'users', user.uid);
        try {
          await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            role: user.email === ADMIN_EMAIL ? 'admin' : 'user',
            createdAt: Timestamp.now()
          }, { merge: true });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchAllPlans = async () => {
    if (!currentUser || currentUser.email !== ADMIN_EMAIL) return;
    setIsLoadingPlans(true);
    try {
      const q = query(collection(db, 'lessonPlans'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const plans = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as (LessonPlanData & { id: string })[];
      setAllPlans(plans);
    } catch (err) {
      console.error("Error fetching plans:", err);
      handleFirestoreError(err, OperationType.LIST, 'lessonPlans');
    } finally {
      setIsLoadingPlans(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const generateLessonPlan = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const units = parseInt(formData.unitsRequired) || 1;
      const totalMinutes = units * 35;
      const durationStr = `${totalMinutes} Minutes (${units} Unit${units > 1 ? 's' : ''})`;

      const prompt = `
        Create a professional and effective lesson plan in ${formData.medium} language based on the following information:
        Teacher Name: ${formData.teacherName}
        Class: ${formData.className}
        Subject: ${formData.subject}
        Month: ${formData.month}
        Week: ${formData.week}
        Day: ${formData.day}
        Topic: ${formData.topic}
        Units Required: ${formData.unitsRequired} (${durationStr})
        Date: ${formData.date}
        
        Specific ELOs (if provided, use them; if blank, generate automatically): ${formData.elos || 'Generate automatically based on topic'}
        Specific Home Work (if provided, use it; if blank, generate creative related to topic automatically): ${formData.homeWork || 'Generate creative homework automatically'}

        Constraints:
        - Topic: If the input topic is long, provide a concise version using keywords related to the topic.
        - ELOs to be Covered: Strictly limit to 3 lines maximum.
        - Warm Up Activity: Strictly limit to 5 lines maximum.
        - The lesson plan must follow international teaching effective pedagogies (like Bloom's Taxonomy, Active Learning, etc.).
        - The output must be strictly in ${formData.medium} language for all content fields.
        - Since the duration is ${totalMinutes} minutes, provide a detailed time breakdown in the delivery procedure.
        
        Return the result strictly as a JSON object with the following keys:
        {
          "teacherName": "${formData.medium === 'Urdu' ? 'Urdu translation/transliteration' : 'Original name'}",
          "className": "${formData.medium === 'Urdu' ? 'Urdu translation' : 'Original class'}",
          "subject": "${formData.medium === 'Urdu' ? 'Urdu translation' : 'Original subject'}",
          "month": "${formData.medium === 'Urdu' ? 'Urdu translation' : 'Original month'}",
          "week": "${formData.medium === 'Urdu' ? 'Urdu translation' : 'Original week'}",
          "day": "${formData.medium === 'Urdu' ? 'Urdu translation' : 'Original day'}",
          "topic": "${formData.medium === 'Urdu' ? 'Urdu translation/expansion (concise keywords if long)' : 'Original topic (concise keywords if long)'}",
          "unitsRequired": "${formData.unitsRequired}",
          "duration": "${durationStr}",
          "date": "${formData.date}",
          "elos": "ELOs (Expected Learning Outcomes) in ${formData.medium} (max 3 lines)",
          "resources": "Resources required in ${formData.medium}",
          "warmUpActivity": "Warm up activity in ${formData.medium} (max 5 lines)",
          "softSkills": "Soft skills to be nurtured in ${formData.medium}",
          "deliveryProcedure": "Detailed lesson delivery procedure with ${totalMinutes} mins breakdown in ${formData.medium}",
          "evaluation": "Learning evaluation/Assessment in ${formData.medium}",
          "homeWork": "Home work assignment in ${formData.medium}",
          "reflection": "Teacher's reflection section (placeholder in ${formData.medium})"
        }
      `;

      const response = await fetch("/api/generate-lesson-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate lesson plan.");
      }

      const result = await response.json();
      const planWithMetadata = { 
        ...result, 
        medium: formData.medium,
        authorId: currentUser?.uid || 'guest',
        authorEmail: currentUser?.email || 'guest',
        createdAt: Timestamp.now()
      };
      
      // Save to Firestore only if logged in
      if (currentUser) {
        try {
          await addDoc(collection(db, 'lessonPlans'), planWithMetadata);
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, 'lessonPlans');
        }
      }
      
      setGeneratedPlan(planWithMetadata);
      setIsEditing(false);
    } catch (err) {
      console.error("Generation error:", err);
      setError("Failed to generate lesson plan. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPDF = async () => {
    if (!pdfRef.current) return;
    
    const canvas = await html2canvas(pdfRef.current, {
      scale: 2,
      useCORS: true,
      logging: false,
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Lesson_Plan_${generatedPlan?.topic || 'Urdu'}.pdf`);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!generatedPlan) return;
    const { name, value } = e.target;
    setGeneratedPlan(prev => prev ? ({ ...prev, [name]: value }) : null);
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  if (showAdminPanel && currentUser?.email === ADMIN_EMAIL) {
    const filteredPlans = adminFilterClass 
      ? allPlans.filter(p => p.className?.toLowerCase().includes(adminFilterClass.toLowerCase()))
      : allPlans;

    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-blue-100 sticky top-0 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowAdminPanel(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <ArrowLeft size={24} className="text-slate-600" />
              </button>
              <h1 className="text-xl font-bold text-blue-900">Admin Panel - All Plans</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text"
                  placeholder="Filter by Class..."
                  value={adminFilterClass}
                  onChange={(e) => setAdminFilterClass(e.target.value)}
                  className="pl-10 pr-4 py-2 rounded-xl border border-blue-100 focus:ring-2 focus:ring-blue-500 outline-none w-64"
                />
              </div>
              <button 
                onClick={fetchAllPlans}
                className="p-2 hover:bg-blue-50 text-blue-600 rounded-xl transition-colors"
                title="Refresh"
              >
                <Loader2 className={isLoadingPlans ? "animate-spin" : ""} size={20} />
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPlans.map((plan) => (
              <motion.div 
                key={plan.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm hover:shadow-md transition-all cursor-pointer"
                onClick={() => {
                  setGeneratedPlan(plan);
                  setShowAdminPanel(false);
                }}
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded">
                    {plan.className} - {plan.subject}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {plan.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
                  </span>
                </div>
                <h3 className="font-bold text-slate-800 mb-1">{plan.topic}</h3>
                <p className="text-sm text-slate-500 mb-4">By: {plan.authorEmail}</p>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{plan.medium} Medium</span>
                  <ChevronRight size={16} />
                </div>
              </motion.div>
            ))}
          </div>
          {filteredPlans.length === 0 && !isLoadingPlans && (
            <div className="text-center py-20 text-slate-400">
              <FileText size={48} className="mx-auto mb-4 opacity-20" />
              <p>No lesson plans found.</p>
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100">
      {/* Header */}
      <header className="bg-white border-b border-blue-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-900 rounded-full flex items-center justify-center text-white shadow-lg">
              <Layers size={28} />
            </div>
            <div className="flex flex-col items-start">
              <h1 className="text-xl font-bold tracking-tight text-blue-900 leading-tight">
                DAR-UL-MADINAH
              </h1>
              <p className="text-[10px] font-semibold text-blue-600 tracking-[0.2em] uppercase">
                International Islamic School System
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {currentUser.email === ADMIN_EMAIL && (
              <button
                onClick={() => {
                  setShowAdminPanel(true);
                  fetchAllPlans();
                }}
                className="flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-xl font-medium hover:bg-slate-200 transition-all"
              >
                <Shield size={18} />
                <span>Admin</span>
              </button>
            )}
            {generatedPlan && (
              <button
                onClick={downloadPDF}
                className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-200"
              >
                <Download size={18} />
                <span>Download PDF</span>
              </button>
            )}
            <div className="h-8 w-[1px] bg-slate-200 mx-1" />
            <div className="flex items-center gap-3 pl-2">
              <img src={currentUser.photoURL || ''} alt={currentUser.displayName || ''} className="w-8 h-8 rounded-full border border-blue-100" />
              <button 
                onClick={logout}
                className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Input Form */}
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-white p-6 rounded-2xl border border-blue-100 shadow-xl shadow-blue-900/5">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Plus size={20} />
              </div>
              <h2 className="text-lg font-semibold text-blue-900">Lesson Planner</h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <User size={14} /> Teacher Name
                </label>
                <input
                  type="text"
                  name="teacherName"
                  value={formData.teacherName}
                  onChange={handleInputChange}
                  placeholder="e.g. Muhammad Saeed Raza"
                  className="w-full px-4 py-2.5 rounded-xl border border-blue-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
                    <Layers size={14} /> Class
                  </label>
                  <input
                    type="text"
                    name="className"
                    value={formData.className}
                    onChange={handleInputChange}
                    placeholder="e.g. 9th"
                    className="w-full px-4 py-2.5 rounded-xl border border-blue-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
                    <BookOpen size={14} /> Subject
                  </label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    placeholder="e.g. Islamiat"
                    className="w-full px-4 py-2.5 rounded-xl border border-blue-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-600">Medium</label>
                  <select
                    name="medium"
                    value={formData.medium}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-blue-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
                  >
                    <option value="Urdu">Urdu</option>
                    <option value="English">English</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-600">Units</label>
                  <input
                    type="number"
                    name="unitsRequired"
                    min="1"
                    value={formData.unitsRequired}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-blue-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600">Month</label>
                  <input
                    type="text"
                    name="month"
                    value={formData.month}
                    onChange={handleInputChange}
                    placeholder="April"
                    className="w-full px-2 py-2 rounded-lg border border-blue-100 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600">Week</label>
                  <input
                    type="text"
                    name="week"
                    value={formData.week}
                    onChange={handleInputChange}
                    placeholder="1"
                    className="w-full px-2 py-2 rounded-lg border border-blue-100 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600">Day</label>
                  <input
                    type="text"
                    name="day"
                    value={formData.day}
                    onChange={handleInputChange}
                    placeholder="Mon"
                    className="w-full px-2 py-2 rounded-lg border border-blue-100 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-600">Topic</label>
                <input
                  type="text"
                  name="topic"
                  value={formData.topic}
                  onChange={handleInputChange}
                  placeholder="e.g. Surah An-Nisa Verses 29-36"
                  className="w-full px-4 py-2.5 rounded-xl border border-blue-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-600">Specific ELOs (Optional)</label>
                <textarea
                  name="elos"
                  value={formData.elos}
                  onChange={handleInputChange}
                  placeholder="Leave blank to generate automatically"
                  rows={2}
                  className="w-full px-4 py-2 rounded-xl border border-blue-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-600">Specific Home Work (Optional)</label>
                <textarea
                  name="homeWork"
                  value={formData.homeWork}
                  onChange={handleInputChange}
                  placeholder="Leave blank to generate automatically"
                  rows={2}
                  className="w-full px-4 py-2 rounded-xl border border-blue-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-600">Date</label>
                <input
                  type="text"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  placeholder="e.g. 24-03-2026"
                  className="w-full px-4 py-2.5 rounded-xl border border-blue-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              <button
                onClick={generateLessonPlan}
                disabled={isGenerating || !formData.topic}
                className="w-full mt-4 bg-blue-600 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-100"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Generating Plan...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={20} />
                    <span>Generate Lesson Plan</span>
                  </>
                )}
              </button>
              
              {error && (
                <p className="text-red-500 text-sm mt-2 text-center font-medium">{error}</p>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Preview & Editor */}
        <div className="lg:col-span-8 space-y-6">
          <AnimatePresence mode="wait">
            {!generatedPlan ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white border-2 border-dashed border-blue-100 rounded-3xl h-[700px] flex flex-col items-center justify-center text-slate-400 p-8 text-center"
              >
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                  <FileText size={40} className="text-blue-200" />
                </div>
                <h3 className="text-xl font-semibold text-blue-900 mb-2">Ready to Plan?</h3>
                <p className="max-w-xs text-slate-500">Fill in the details on the left to generate a professional lesson plan for Dar-ul-Madinah.</p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4"
              >
                {/* Toolbar */}
                <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-blue-100 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">
                      {generatedPlan.medium} Medium
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                        isEditing 
                        ? 'bg-green-50 text-green-700 hover:bg-green-100' 
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {isEditing ? <><Save size={18} /> Save Changes</> : <><Edit3 size={18} /> Edit Plan</>}
                    </button>
                    <button
                      onClick={() => setGeneratedPlan(null)}
                      className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                      title="Clear Plan"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>

                {/* The Lesson Plan Document */}
                <div className="bg-white shadow-2xl rounded-sm border border-slate-200 min-h-[800px] relative overflow-x-auto">
                  <div className="min-w-[210mm] p-4 md:p-8">
                    {isEditing ? (
                      <div className={`space-y-6 ${generatedPlan.medium === 'Urdu' ? 'font-urdu text-right' : 'font-sans text-left'}`} dir={generatedPlan.medium === 'Urdu' ? 'rtl' : 'ltr'}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase">Teacher Name</label>
                          <input
                            name="teacherName"
                            value={generatedPlan.teacherName}
                            onChange={handleEditChange}
                            className={`w-full p-2 border rounded bg-slate-50 text-lg ${generatedPlan.medium === 'Urdu' ? 'urdu-text' : ''}`}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase">Topic</label>
                          <input
                            name="topic"
                            value={generatedPlan.topic}
                            onChange={handleEditChange}
                            className={`w-full p-2 border rounded bg-slate-50 text-lg ${generatedPlan.medium === 'Urdu' ? 'urdu-text' : ''}`}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">ELOs to be Covered</label>
                        <textarea
                          name="elos"
                          value={generatedPlan.elos}
                          onChange={handleEditChange}
                          rows={3}
                          className={`w-full p-3 border rounded bg-slate-50 text-lg leading-relaxed ${generatedPlan.medium === 'Urdu' ? 'urdu-text' : ''}`}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">Resources Required</label>
                        <textarea
                          name="resources"
                          value={generatedPlan.resources}
                          onChange={handleEditChange}
                          rows={2}
                          className={`w-full p-3 border rounded bg-slate-50 text-lg leading-relaxed ${generatedPlan.medium === 'Urdu' ? 'urdu-text' : ''}`}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">Warm Up Activity</label>
                        <textarea
                          name="warmUpActivity"
                          value={generatedPlan.warmUpActivity}
                          onChange={handleEditChange}
                          rows={2}
                          className={`w-full p-3 border rounded bg-slate-50 text-lg leading-relaxed ${generatedPlan.medium === 'Urdu' ? 'urdu-text' : ''}`}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">Soft Skills to be Nurtured</label>
                        <textarea
                          name="softSkills"
                          value={generatedPlan.softSkills}
                          onChange={handleEditChange}
                          rows={2}
                          className={`w-full p-3 border rounded bg-slate-50 text-lg leading-relaxed ${generatedPlan.medium === 'Urdu' ? 'urdu-text' : ''}`}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">Lesson Delivery Procedure & Teaching Strategies</label>
                        <textarea
                          name="deliveryProcedure"
                          value={generatedPlan.deliveryProcedure}
                          onChange={handleEditChange}
                          rows={6}
                          className={`w-full p-3 border rounded bg-slate-50 text-lg leading-relaxed ${generatedPlan.medium === 'Urdu' ? 'urdu-text' : ''}`}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase">Learning Evaluation</label>
                          <textarea
                            name="evaluation"
                            value={generatedPlan.evaluation}
                            onChange={handleEditChange}
                            rows={3}
                            className={`w-full p-3 border rounded bg-slate-50 text-lg ${generatedPlan.medium === 'Urdu' ? 'urdu-text' : ''}`}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase">Home Work</label>
                          <textarea
                            name="homeWork"
                            value={generatedPlan.homeWork}
                            onChange={handleEditChange}
                            rows={3}
                            className={`w-full p-3 border rounded bg-slate-50 text-lg ${generatedPlan.medium === 'Urdu' ? 'urdu-text' : ''}`}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">Teacher's Reflection</label>
                        <textarea
                          name="reflection"
                          value={generatedPlan.reflection}
                          onChange={handleEditChange}
                          rows={2}
                          className={`w-full p-3 border rounded bg-slate-50 text-lg leading-relaxed ${generatedPlan.medium === 'Urdu' ? 'urdu-text' : ''}`}
                        />
                      </div>
                    </div>
                  ) : (
                    <div ref={pdfRef} className={`bg-white text-black mx-auto ${generatedPlan.medium === 'Urdu' ? 'urdu-text' : 'font-sans'}`} style={{ backgroundColor: '#ffffff', color: '#000000', width: '210mm', minHeight: '297mm', padding: '10mm' }}>
                      {/* Header Box */}
                      <div className="border-2 p-3 mb-4 text-center" style={{ borderColor: '#1e3a8a', borderStyle: 'solid', borderWidth: '2px', backgroundColor: '#f0f7ff' }}>
                        <h2 className="text-lg font-bold uppercase tracking-widest mb-0.5 text-blue-900" style={{ textAlign: 'center', color: '#1e3a8a' }}>DAR-UL-MADINAH INTERNATIONAL ISLAMIC SCHOOL SYSTEM</h2>
                        <p className="italic text-[10px] mb-2 text-blue-700" style={{ textAlign: 'center', color: '#1d4ed8' }}>Dawat-e-Islami</p>
                        <div className="border-t pt-1.5" style={{ borderColor: '#1e3a8a', borderTopWidth: '1px', borderTopStyle: 'solid', textAlign: 'center' }}>
                          <h1 className="text-xl font-bold text-blue-900" dir={generatedPlan.medium === 'Urdu' ? 'rtl' : 'ltr'} style={{ textAlign: 'center', width: '100%', color: '#1e3a8a' }}>
                            {generatedPlan.medium === 'Urdu' ? 'Lesson Plan & Progression Grid' : 'Lesson Plan & Progression Grid'}
                          </h1>
                        </div>
                      </div>

                      {/* Info Table - Compact */}
                      <div className="w-full border-collapse border mb-4 text-[10px]" dir={generatedPlan.medium === 'Urdu' ? 'rtl' : 'ltr'} style={{ borderColor: '#1e3a8a', borderStyle: 'solid', borderWidth: '1px' }}>
                        <div className="grid grid-cols-9 border-b" style={{ borderColor: '#1e3a8a', borderBottomWidth: '1px', borderBottomStyle: 'solid' }}>
                          <div className="border-l p-1 font-bold bg-blue-50 text-blue-900 flex items-center justify-center min-h-[30px]" style={{ borderColor: '#1e3a8a', borderLeftWidth: '1px', borderLeftStyle: 'solid', backgroundColor: '#eff6ff', textAlign: 'center', alignSelf: 'center' }}>
                            {generatedPlan.medium === 'Urdu' ? 'استاد' : 'Teacher'}
                          </div>
                          <div className="border-l p-1 font-bold bg-blue-50 text-blue-900 flex items-center justify-center min-h-[30px]" style={{ borderColor: '#1e3a8a', borderLeftWidth: '1px', borderLeftStyle: 'solid', backgroundColor: '#eff6ff', textAlign: 'center', alignSelf: 'center' }}>
                            {generatedPlan.medium === 'Urdu' ? 'جماعت' : 'Class'}
                          </div>
                          <div className="border-l p-1 font-bold bg-blue-50 text-blue-900 flex items-center justify-center min-h-[30px]" style={{ borderColor: '#1e3a8a', borderLeftWidth: '1px', borderLeftStyle: 'solid', backgroundColor: '#eff6ff', textAlign: 'center', alignSelf: 'center' }}>
                            {generatedPlan.medium === 'Urdu' ? 'مضمون' : 'Subject'}
                          </div>
                          <div className="border-l p-1 font-bold bg-blue-50 text-blue-900 flex items-center justify-center min-h-[30px]" style={{ borderColor: '#1e3a8a', borderLeftWidth: '1px', borderLeftStyle: 'solid', backgroundColor: '#eff6ff', textAlign: 'center', alignSelf: 'center' }}>
                            {generatedPlan.medium === 'Urdu' ? 'مہینہ' : 'Month'}
                          </div>
                          <div className="border-l p-1 font-bold bg-blue-50 text-blue-900 flex items-center justify-center min-h-[30px]" style={{ borderColor: '#1e3a8a', borderLeftWidth: '1px', borderLeftStyle: 'solid', backgroundColor: '#eff6ff', textAlign: 'center', alignSelf: 'center' }}>
                            {generatedPlan.medium === 'Urdu' ? 'ہفتہ' : 'Week'}
                          </div>
                          <div className="border-l p-1 font-bold bg-blue-50 text-blue-900 flex items-center justify-center min-h-[30px]" style={{ borderColor: '#1e3a8a', borderLeftWidth: '1px', borderLeftStyle: 'solid', backgroundColor: '#eff6ff', textAlign: 'center', alignSelf: 'center' }}>
                            {generatedPlan.medium === 'Urdu' ? 'دن' : 'Day'}
                          </div>
                          <div className="border-l p-1 font-bold bg-blue-50 text-blue-900 flex items-center justify-center min-h-[30px]" style={{ borderColor: '#1e3a8a', borderLeftWidth: '1px', borderLeftStyle: 'solid', backgroundColor: '#eff6ff', textAlign: 'center', alignSelf: 'center' }}>
                            {generatedPlan.medium === 'Urdu' ? 'یونٹ' : 'Units'}
                          </div>
                          <div className="border-l p-1 font-bold bg-blue-50 text-blue-900 flex items-center justify-center min-h-[30px]" style={{ borderColor: '#1e3a8a', borderLeftWidth: '1px', borderLeftStyle: 'solid', backgroundColor: '#eff6ff', textAlign: 'center', alignSelf: 'center' }}>
                            {generatedPlan.medium === 'Urdu' ? 'تاریخ' : 'Date'}
                          </div>
                          <div className="p-1 font-bold bg-blue-50 text-blue-900 flex items-center justify-center min-h-[30px]" style={{ backgroundColor: '#eff6ff', textAlign: 'center', alignSelf: 'center' }}>
                            {generatedPlan.medium === 'Urdu' ? 'موضوع' : 'Topic'}
                          </div>
                        </div>
                        <div className="grid grid-cols-9">
                          <div className="border-l p-1 flex items-center justify-center min-h-[30px]" style={{ borderColor: '#1e3a8a', borderLeftWidth: '1px', borderLeftStyle: 'solid', textAlign: 'center' }}>{generatedPlan.teacherName}</div>
                          <div className="border-l p-1 flex items-center justify-center min-h-[30px]" style={{ borderColor: '#1e3a8a', borderLeftWidth: '1px', borderLeftStyle: 'solid', textAlign: 'center' }}>{generatedPlan.className}</div>
                          <div className="border-l p-1 flex items-center justify-center min-h-[30px]" style={{ borderColor: '#1e3a8a', borderLeftWidth: '1px', borderLeftStyle: 'solid', textAlign: 'center' }}>{generatedPlan.subject}</div>
                          <div className="border-l p-1 flex items-center justify-center min-h-[30px]" style={{ borderColor: '#1e3a8a', borderLeftWidth: '1px', borderLeftStyle: 'solid', textAlign: 'center' }}>{generatedPlan.month}</div>
                          <div className="border-l p-1 flex items-center justify-center min-h-[30px]" style={{ borderColor: '#1e3a8a', borderLeftWidth: '1px', borderLeftStyle: 'solid', textAlign: 'center' }}>{generatedPlan.week}</div>
                          <div className="border-l p-1 flex items-center justify-center min-h-[30px]" style={{ borderColor: '#1e3a8a', borderLeftWidth: '1px', borderLeftStyle: 'solid', textAlign: 'center' }}>{generatedPlan.day}</div>
                          <div className="border-l p-1 flex items-center justify-center min-h-[30px]" style={{ borderColor: '#1e3a8a', borderLeftWidth: '1px', borderLeftStyle: 'solid', textAlign: 'center' }}>{generatedPlan.unitsRequired}</div>
                          <div className="border-l p-1 flex items-center justify-center min-h-[30px]" style={{ borderColor: '#1e3a8a', borderLeftWidth: '1px', borderLeftStyle: 'solid', textAlign: 'center' }}>{generatedPlan.date}</div>
                          <div className="p-1 flex items-center justify-center min-h-[30px]" style={{ textAlign: 'center' }}>{generatedPlan.topic}</div>
                        </div>
                      </div>

                        {/* Content Sections */}
                        <div className="space-y-2">
                          <div className="border" style={{ borderColor: '#1e3a8a', borderStyle: 'solid', borderWidth: '1px' }}>
                            <div className="px-3 py-0.5 font-bold text-[10px] bg-blue-900 text-white flex items-center min-h-[24px]" style={{ backgroundColor: '#1e3a8a', color: '#ffffff' }}>ELOs to be Covered</div>
                            <div className={`px-3 py-2 text-[12px] leading-relaxed ${generatedPlan.medium === 'Urdu' ? 'text-right' : 'text-left'}`} dir={generatedPlan.medium === 'Urdu' ? 'rtl' : 'ltr'}>{generatedPlan.elos}</div>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div className="border" style={{ borderColor: '#1e3a8a', borderStyle: 'solid', borderWidth: '1px' }}>
                              <div className="px-3 py-0.5 font-bold text-[10px] bg-blue-900 text-white flex items-center min-h-[24px]" style={{ backgroundColor: '#1e3a8a', color: '#ffffff' }}>Resources Required</div>
                              <div className={`px-3 py-2 text-[12px] leading-relaxed ${generatedPlan.medium === 'Urdu' ? 'text-right' : 'text-left'}`} dir={generatedPlan.medium === 'Urdu' ? 'rtl' : 'ltr'}>{generatedPlan.resources}</div>
                            </div>
                            <div className="border" style={{ borderColor: '#1e3a8a', borderStyle: 'solid', borderWidth: '1px' }}>
                              <div className="px-3 py-0.5 font-bold text-[10px] bg-blue-900 text-white flex items-center min-h-[24px]" style={{ backgroundColor: '#1e3a8a', color: '#ffffff' }}>Warm Up Activity</div>
                              <div className={`px-3 py-2 text-[12px] leading-relaxed ${generatedPlan.medium === 'Urdu' ? 'text-right' : 'text-left'}`} dir={generatedPlan.medium === 'Urdu' ? 'rtl' : 'ltr'}>{generatedPlan.warmUpActivity}</div>
                            </div>
                            <div className="border" style={{ borderColor: '#1e3a8a', borderStyle: 'solid', borderWidth: '1px' }}>
                              <div className="px-3 py-0.5 font-bold text-[10px] bg-blue-900 text-white flex items-center min-h-[24px]" style={{ backgroundColor: '#1e3a8a', color: '#ffffff' }}>Soft Skills</div>
                              <div className={`px-3 py-2 text-[12px] leading-relaxed ${generatedPlan.medium === 'Urdu' ? 'text-right' : 'text-left'}`} dir={generatedPlan.medium === 'Urdu' ? 'rtl' : 'ltr'}>{generatedPlan.softSkills}</div>
                            </div>
                          </div>

                          <div className="border" style={{ borderColor: '#1e3a8a', borderStyle: 'solid', borderWidth: '1px' }}>
                            <div className="px-3 py-0.5 font-bold text-[10px] bg-blue-900 text-white flex justify-between items-center min-h-[24px]" style={{ backgroundColor: '#1e3a8a', color: '#ffffff' }}>
                              <span>Lesson Delivery Procedure & Teaching Strategies</span>
                              <span>Duration: {generatedPlan.duration}</span>
                            </div>
                            <div className={`px-3 py-2 text-[12px] leading-relaxed ${generatedPlan.medium === 'Urdu' ? 'text-right' : 'text-left'}`} dir={generatedPlan.medium === 'Urdu' ? 'rtl' : 'ltr'}>{generatedPlan.deliveryProcedure}</div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="border" style={{ borderColor: '#1e3a8a', borderStyle: 'solid', borderWidth: '1px' }}>
                              <div className="px-3 py-0.5 font-bold text-[10px] bg-blue-900 text-white flex items-center min-h-[24px]" style={{ backgroundColor: '#1e3a8a', color: '#ffffff' }}>Learning Evaluation</div>
                              <div className={`px-3 py-2 text-[12px] leading-relaxed ${generatedPlan.medium === 'Urdu' ? 'text-right' : 'text-left'}`} dir={generatedPlan.medium === 'Urdu' ? 'rtl' : 'ltr'}>{generatedPlan.evaluation}</div>
                            </div>
                            <div className="border" style={{ borderColor: '#1e3a8a', borderStyle: 'solid', borderWidth: '1px' }}>
                              <div className="px-3 py-0.5 font-bold text-[10px] bg-blue-900 text-white flex items-center min-h-[24px]" style={{ backgroundColor: '#1e3a8a', color: '#ffffff' }}>Home Work</div>
                              <div className={`px-3 py-2 text-[12px] leading-relaxed ${generatedPlan.medium === 'Urdu' ? 'text-right' : 'text-left'}`} dir={generatedPlan.medium === 'Urdu' ? 'rtl' : 'ltr'}>{generatedPlan.homeWork}</div>
                            </div>
                          </div>

                          <div className="border" style={{ borderColor: '#1e3a8a', borderStyle: 'solid', borderWidth: '1px' }}>
                            <div className="px-3 py-0.5 font-bold text-[10px] bg-blue-900 text-white flex items-center min-h-[24px]" style={{ backgroundColor: '#1e3a8a', color: '#ffffff' }}>Teacher's Reflection</div>
                            <div className={`px-3 py-2 text-[12px] leading-relaxed ${generatedPlan.medium === 'Urdu' ? 'text-right' : 'text-left'}`} dir={generatedPlan.medium === 'Urdu' ? 'rtl' : 'ltr'}>{generatedPlan.reflection}</div>
                          </div>
                        </div>

                      {/* Signatures */}
                      <div className="grid grid-cols-2 gap-10 mt-16 text-center text-xs" dir={generatedPlan.medium === 'Urdu' ? 'rtl' : 'ltr'}>
                        <div className="border-t pt-2" style={{ borderColor: '#1e3a8a', borderTopWidth: '1px', borderTopStyle: 'solid', textAlign: 'center' }}>
                          <p className="font-bold mb-1 text-blue-900">{generatedPlan.medium === 'Urdu' ? 'استاد کے دستخط' : 'Teacher Signature'}</p>
                        </div>
                        <div className="border-t pt-2" style={{ borderColor: '#1e3a8a', borderTopWidth: '1px', borderTopStyle: 'solid', textAlign: 'center' }}>
                          <p className="font-bold mb-1 text-blue-900">{generatedPlan.medium === 'Urdu' ? 'کوارڈینیٹر کے دستخط' : 'Coordinator Signature'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 py-12 border-t border-blue-100 mt-12 flex flex-col md:flex-row justify-between items-center text-slate-500 text-sm gap-4">
        <p>© 2026 Dar-ul-Madinah International Islamic School System. All rights reserved.</p>
        <div className="flex items-center gap-6">
          {currentUser ? (
            <div className="flex items-center gap-4">
              <span className="text-xs">Logged in as {currentUser.email}</span>
              <button 
                onClick={logout}
                className="text-xs hover:text-blue-600 transition-colors flex items-center gap-1"
              >
                <LogOut size={12} /> Logout
              </button>
            </div>
          ) : (
            <button 
              onClick={signInWithGoogle}
              className="text-xs hover:text-blue-600 transition-colors flex items-center gap-1 opacity-60 hover:opacity-100"
            >
              <Shield size={12} /> Admin Login
            </button>
          )}
        </div>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&family=Inter:wght@400;500;600;700&display=swap');
        
        .urdu-text {
          font-family: 'Noto Nastaliq Urdu', serif;
          line-height: 3.2;
        }

        .font-urdu {
          font-family: 'Noto Nastaliq Urdu', serif;
        }

        [dir="rtl"] {
          text-align: right;
        }

        textarea.urdu-text, input.urdu-text {
          line-height: 2;
          padding-top: 14px;
          padding-bottom: 14px;
        }

        .font-sans {
          font-family: 'Inter', sans-serif;
        }
      `}</style>
    </div>
    </ErrorBoundary>
  );
}
