import React, { useState, useEffect } from 'react';
import { Loader2, Download, Sparkles } from 'lucide-react';
import { ClassName } from '../../types/marksheet';
import { INITIAL_CLASSES, DEFAULT_CLASS_SUBJECTS } from '../../data/marksheetData';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { GoogleGenAI } from "@google/genai";

interface ThemeContent {
  title: string;
  hook: string;
  coreConnection: string;
  islamicIntegration: string;
}

export default function SubjectThemeGenerator() {
  const [activeClass, setActiveClass] = useState<ClassName>('Class IV');
  const [selectedSubject, setSelectedSubject] = useState<string>('English');
  const [teacherName, setTeacherName] = useState<string>('');
  const [topic, setTopic] = useState<string>('');
  const [medium, setMedium] = useState<'English' | 'Urdu'>('English');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const [themeContent, setThemeContent] = useState<ThemeContent | null>(null);

  const currentSubjects = DEFAULT_CLASS_SUBJECTS[activeClass] || [];

  useEffect(() => {
    if (currentSubjects.length > 0 && !currentSubjects.find(s => s.name === selectedSubject)) {
      setSelectedSubject(currentSubjects[0].name);
    }
  }, [activeClass, currentSubjects, selectedSubject]);

  const generateTheme = async () => {
    if (!topic.trim() || !teacherName.trim()) {
      alert("Please enter both the topic and teacher's name.");
      return;
    }

    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `
        You are an expert Islamic Educator for "Darul Madinah International Islamic School System" (associated with Dawate Islami).
        Generate a "Subject Theme" layout for the topic "${topic}" in class "${activeClass}" for the subject "${selectedSubject}".
        The output must be in ${medium} language.
        
        CRITICAL RULES:
        1. Always write Prophet Muhammad's name completely with the Arabic abbreviation beautifully like: Prophet Muhammad ﷺ (or حضرت محمد ﷺ in Urdu).
        2. Provide complete Islamic abbreviations for other noble names as well (like Radiallahu Anhu, Alaihis Salam, etc. suitably).
        3. Keep the tone engaging, educational, and deeply connected to Dawate Islami's mission of tarbiyyah and Islamic values.
        4. DESIGN FOR VISUAL LEARNING: This theme is designed for STUDENTS. Use highly visual, captivating language, short impactful sentences, and relevant EMOJIS.
        5. Provide content for a physical A4 poster that will be put on a classroom soft board. It must be exciting and easily readable for children.

        Return a JSON object with EXACTLY the following keys:
        {
          "title": "A catchy, beautiful title for the theme (include emojis)",
          "hook": "Interest builder / attention grabber that excites students (1-2 short paragraphs, use emojis)",
          "coreConnection": "Core concepts explained simply for students (use bullet points or short paragraphs, use emojis)",
          "islamicIntegration": "How this relates to Islamic values, Quran/Hadith, explained beautifully for students (1-2 short paragraphs, use emojis)"
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
        }
      });

      const responseText = response.text || "{}";
      const data = JSON.parse(responseText);
      setThemeContent(data as ThemeContent);
      
    } catch (error) {
      console.error("Failed to generate theme:", error);
      alert("Failed to generate subject theme. Please check your API key or try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!themeContent) return;

    setIsDownloading(true);
    try {
      const pageEl = document.getElementById('subject-theme-a4-print');
      if (pageEl) {
        // Temporarily prepare for PDF capture
        pageEl.style.display = 'flex';
        
        const canvas = await html2canvas(pageEl, { 
          scale: 2, 
          useCORS: true, 
          logging: false 
        });

        pageEl.style.display = 'none';
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
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
        
        pdf.addImage(imgData, 'PNG', xOffset, 0, finalWidth, pdfHeight);
        
        const safeTopic = topic.replace(/[^a-zA-Z0-9]/g, '_');
        const dateStr = new Date().toISOString().split('T')[0];
        pdf.save(`Subject_Theme_${safeTopic}_${dateStr}.pdf`);
      } else {
        alert("Could not find the print container element.");
      }
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleContentChange = (field: keyof ThemeContent, value: string) => {
    if (themeContent) {
      setThemeContent({ ...themeContent, [field]: value });
    }
  };

  const renderThemeContent = (id: string, isPrint: boolean = false) => {
    if (!themeContent) return null;
    return (
      <div 
        id={id}
        className={`bg-white relative flex flex-col ${isPrint ? '' : 'shadow-2xl'}`}
        style={{
          width: '794px', // 210mm at 96 DPI
          minHeight: '1123px', // 297mm at 96 DPI
          padding: '40px', // ~15mm
          boxSizing: 'border-box',
          fontFamily: medium === 'Urdu' ? "'Jameel Noori Nastaleeq', 'Nafees Nastaleeq', sans-serif" : "Georgia, serif",
          backgroundColor: '#ffffff'
        }}
        dir={medium === 'Urdu' ? 'rtl' : 'ltr'}
      >
        {/* Outer Decorative Border - using solid instead of double to prevent html2canvas crashing */}
        <div className="absolute inset-4 border-[6px] border-solid border-green-800/30 rounded-xl pointer-events-none" />
        <div className="absolute inset-[22px] border border-solid border-green-800/20 rounded-lg pointer-events-none" />

        {/* Header */}
        <div className="text-center mb-8 border-b-2 border-green-800 pb-6 relative z-10">
          <h1 className="text-3xl font-extrabold text-green-900 uppercase tracking-wider font-sans mb-3">
            {themeContent.title}
          </h1>
          <div className="flex justify-center gap-8 text-sm font-bold text-gray-600 uppercase font-sans">
            <span>{activeClass.replace('Class ', 'Class: ')}</span>
            <span>Subject: {selectedSubject}</span>
            <span>Topic: {topic}</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex flex-col gap-8 relative z-10">
          
          {/* Hook Section */}
          <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100 shadow-sm relative">
            <div className="absolute -top-4 left-6 bg-white px-4 py-1 font-bold text-emerald-800 uppercase text-sm tracking-widest border-2 border-emerald-200 rounded-full font-sans">
              {medium === 'English' ? 'Focus Hook' : 'مرکزی خیال'}
            </div>
            <p className="text-gray-800 text-xl leading-relaxed whitespace-pre-wrap mt-3">
              {themeContent.hook}
            </p>
          </div>

          {/* Core Connection */}
          <div className="p-6 rounded-2xl border border-gray-200 bg-white relative shadow-sm">
            <div className="absolute -top-4 left-6 bg-white px-4 py-1 font-bold text-blue-800 uppercase text-sm tracking-widest border-2 border-blue-200 rounded-full font-sans">
              {medium === 'English' ? 'Core Concept' : 'بنیادی تصور'}
            </div>
            <p className="text-gray-800 text-xl leading-relaxed whitespace-pre-wrap mt-3">
              {themeContent.coreConnection}
            </p>
          </div>

          {/* Islamic Integration */}
          <div className="bg-green-50 p-6 rounded-2xl border border-green-200 shadow-sm relative flex-1">
            <div className="absolute -top-4 left-6 bg-white px-4 py-1 font-bold text-green-800 uppercase text-sm tracking-widest border-2 border-green-200 rounded-full font-sans">
              {medium === 'English' ? 'Islamic Perspective' : 'اسلامی نقطہ نظر'}
            </div>
            <p className="text-green-950 text-xl leading-relaxed whitespace-pre-wrap mt-3">
              {themeContent.islamicIntegration}
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-green-800/20 text-center relative z-10 flex flex-col items-center gap-2">
          <div className="text-lg font-bold text-gray-800 font-sans">
            {medium === 'English' ? 'Subject Teacher: ' : 'مضمون کے استاد: '}
            <span className="text-green-800">{teacherName}</span>
          </div>
          <div className="text-sm font-semibold text-gray-500 uppercase tracking-widest font-sans mt-2">
            Dar-ul-Madinah International Islamic School System
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-xl shadow-blue-900/5">
      <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
        <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
          <Sparkles size={20} />
        </div>
        <h2 className="text-xl font-bold text-blue-900">Subject Theme Generator</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Class</label>
          <select 
            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            value={activeClass}
            onChange={(e) => setActiveClass(e.target.value as ClassName)}
          >
            {INITIAL_CLASSES.map(cls => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Subject</label>
          <select 
            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
          >
            {currentSubjects.map(sub => (
              <option key={sub.id} value={sub.name}>{sub.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Medium</label>
          <select 
            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            value={medium}
            onChange={(e) => setMedium(e.target.value as 'English' | 'Urdu')}
          >
            <option value="English">English</option>
            <option value="Urdu">Urdu</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Teacher Name</label>
          <input 
            type="text"
            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="E.g. Hafiz Ahmed"
            value={teacherName}
            onChange={(e) => setTeacherName(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Topic</label>
          <input 
            type="text"
            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="E.g. Solar System"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end mb-8 border-b border-gray-100 pb-6">
        <button 
          onClick={generateTheme}
          disabled={isGenerating || !topic.trim() || !teacherName.trim()}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-md shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
          <span>{isGenerating ? 'Generating Theme...' : 'Generate Theme'}</span>
        </button>
      </div>

      {themeContent && (
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Editor Side */}
          <div className="w-full lg:w-1/3 flex flex-col gap-4">
            <h3 className="font-bold text-gray-800 text-lg mb-2">Edit Content</h3>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Title</label>
              <input 
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                value={themeContent.title}
                onChange={(e) => handleContentChange('title', e.target.value)}
                dir={medium === 'Urdu' ? 'rtl' : 'ltr'}
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Hook / Interest Builder</label>
              <textarea 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm h-32 resize-none"
                value={themeContent.hook}
                onChange={(e) => handleContentChange('hook', e.target.value)}
                dir={medium === 'Urdu' ? 'rtl' : 'ltr'}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Core Connection</label>
              <textarea 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm h-32 resize-none"
                value={themeContent.coreConnection}
                onChange={(e) => handleContentChange('coreConnection', e.target.value)}
                dir={medium === 'Urdu' ? 'rtl' : 'ltr'}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Islamic Integration</label>
              <textarea 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm h-32 resize-none"
                value={themeContent.islamicIntegration}
                onChange={(e) => handleContentChange('islamicIntegration', e.target.value)}
                dir={medium === 'Urdu' ? 'rtl' : 'ltr'}
              />
            </div>

            <button 
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-md mt-4 disabled:opacity-50"
            >
              {isDownloading ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
              <span>Download PDF</span>
            </button>
          </div>

          {/* A4 Preview Side */}
          <div className="w-full lg:w-2/3 flex justify-center bg-gray-100 p-8 rounded-2xl overflow-auto border border-gray-200">
            {renderThemeContent('subject-theme-a4-preview', false)}
          </div>

          {/* Hidden Print Container */}
          <div className="hidden">
            {renderThemeContent('subject-theme-a4-print', true)}
          </div>
        </div>
      )}
    </div>
  );
}
