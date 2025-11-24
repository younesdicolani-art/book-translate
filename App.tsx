import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Download, RefreshCw, AlertTriangle, ArrowRight, Loader2, Clock, CheckCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

import { FileUpload } from './components/FileUpload';
import { Button } from './components/Button';
import { translateDocumentStream } from './services/gemini';
import { TranslationStatus, TranslationState } from './types';

const App: React.FC = () => {
  const [state, setState] = useState<TranslationState>({
    status: TranslationStatus.IDLE,
    originalFile: null,
    fileUrl: null,
    translatedText: '',
    errorMessage: null,
  });

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<number | null>(null);

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (state.fileUrl) {
        URL.revokeObjectURL(state.fileUrl);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [state.fileUrl]);

  // Timer Logic
  useEffect(() => {
    if (state.status === TranslationStatus.TRANSLATING) {
      const startTime = Date.now();
      timerRef.current = window.setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else if (state.status === TranslationStatus.COMPLETED || state.status === TranslationStatus.ERROR) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    } else {
      setElapsedSeconds(0);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state.status]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFileSelect = (file: File) => {
    const url = URL.createObjectURL(file);
    setState({
      status: TranslationStatus.IDLE,
      originalFile: file,
      fileUrl: url,
      translatedText: '',
      errorMessage: null,
    });
    setElapsedSeconds(0);
  };

  const handleStartTranslation = async () => {
    if (!state.originalFile) return;

    setState((prev) => ({ ...prev, status: TranslationStatus.READING_FILE }));

    try {
      // 1. Convert File to Base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Strip the data URL prefix (e.g., "data:application/pdf;base64,")
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(state.originalFile!);
      });

      setState((prev) => ({ 
        ...prev, 
        status: TranslationStatus.TRANSLATING,
        translatedText: '' // Reset text
      }));

      // 2. Call Gemini API with streaming
      await translateDocumentStream(
        base64Data,
        state.originalFile.type,
        (chunk) => {
          setState((prev) => ({
            ...prev,
            translatedText: prev.translatedText + chunk,
          }));
        }
      );

      setState((prev) => ({ ...prev, status: TranslationStatus.COMPLETED }));

    } catch (error: any) {
      console.error("Translation Error:", error);
      setState((prev) => ({
        ...prev,
        status: TranslationStatus.ERROR,
        errorMessage: error.message || "An unknown error occurred during translation.",
      }));
    }
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    // Adding a BOM for proper UTF-8 handling in some editors, though not strictly necessary for modern ones
    const file = new Blob(["\uFEFF" + state.translatedText], { type: 'text/markdown;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `Translated_${state.originalFile?.name.replace('.pdf', '') || 'Book'}_Arabic.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleReset = () => {
    setState({
      status: TranslationStatus.IDLE,
      originalFile: null,
      fileUrl: null,
      translatedText: '',
      errorMessage: null,
    });
    setElapsedSeconds(0);
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0 z-10 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <BookOpen size={24} />
          </div>
          <h1 className="text-xl font-bold text-slate-800 hidden sm:block">GeminiBook Translator</h1>
        </div>

        <div className="flex items-center space-x-3">
          {state.status === TranslationStatus.TRANSLATING && (
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-100">
              <Clock size={14} className="animate-pulse" />
              <span>{formatTime(elapsedSeconds)}</span>
            </div>
          )}
          
          {state.status === TranslationStatus.COMPLETED && (
            <div className="flex items-center space-x-2 mr-2">
              <div className="flex items-center space-x-1 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full text-sm font-medium">
                <Clock size={14} />
                <span>Total: {formatTime(elapsedSeconds)}</span>
              </div>
              <Button 
                variant="secondary" 
                onClick={handleDownload} 
                icon={<Download size={18} />}
                className="shadow-md shadow-emerald-200"
              >
                Download Book
              </Button>
            </div>
          )}
          
          {state.originalFile && (
             <Button 
               variant="outline" 
               onClick={handleReset}
               icon={<RefreshCw size={18} />}
               className="text-slate-600"
             >
               New File
             </Button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        
        {/* State 1: Upload Screen */}
        {!state.originalFile && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50">
            <div className="max-w-3xl w-full text-center space-y-8">
              <div className="space-y-4">
                <h2 className="text-4xl font-bold text-slate-900">Translate Books with AI</h2>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                  Upload PDF books up to 200MB. Our tool translates content to Arabic, preserving structure and describing images.
                </p>
              </div>
              <FileUpload 
                onFileSelect={handleFileSelect} 
                isLoading={false} 
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 text-left">
                {[
                  { title: "Huge Files Supported", desc: "Upload books up to 200MB without issues." },
                  { title: "Full Context", desc: "Preserves chapters, headers, and describes images." },
                  { title: "Real-time AI", desc: "Watch the translation happen live with progress tracking." }
                ].map((item, i) => (
                  <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-semibold text-slate-900 mb-2">{item.title}</h3>
                    <p className="text-slate-500 text-sm">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* State 2 & 3: Viewer / Translation */}
        {state.originalFile && (
          <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
            
            {/* Left Panel: Original PDF */}
            <div className="flex-1 h-1/2 md:h-full border-r border-slate-200 bg-slate-100 relative flex flex-col">
              <div className="h-10 bg-slate-200 px-4 flex items-center justify-between text-xs font-semibold text-slate-600 border-b border-slate-300">
                <span>ORIGINAL DOCUMENT</span>
                <span className="truncate max-w-[200px]">{state.originalFile.name}</span>
              </div>
              <div className="flex-1 relative">
                 {state.fileUrl ? (
                   <iframe
                     src={state.fileUrl}
                     title="PDF Viewer"
                     className="w-full h-full border-none"
                   />
                 ) : (
                   <div className="flex items-center justify-center h-full">
                     <Loader2 className="animate-spin text-slate-400" />
                   </div>
                 )}
              </div>
            </div>

            {/* Right Panel: Arabic Translation */}
            <div className="flex-1 h-1/2 md:h-full bg-white relative flex flex-col">
              <div className="h-10 bg-amber-50 px-4 flex items-center justify-between text-xs font-semibold text-amber-700 border-b border-amber-100">
                <span>ARABIC TRANSLATION</span>
                {state.status === TranslationStatus.TRANSLATING && (
                   <span className="flex items-center gap-2 animate-pulse">
                     <Loader2 size={12} className="animate-spin" />
                     Translating...
                   </span>
                )}
                {state.status === TranslationStatus.COMPLETED && (
                   <span className="flex items-center gap-2 text-emerald-600">
                     <CheckCircle size={14} />
                     Completed
                   </span>
                )}
              </div>

              {state.status === TranslationStatus.IDLE ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white">
                  <div className="bg-blue-50 p-6 rounded-2xl mb-6 max-w-sm">
                    <BookOpen size={48} className="text-blue-500 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Ready to Translate</h3>
                    <p className="text-slate-600 text-sm">
                      Click the button below to start translating <strong>{state.originalFile.name}</strong> to Arabic.
                    </p>
                  </div>
                  <Button 
                    onClick={handleStartTranslation} 
                    className="px-8 py-3 text-lg shadow-lg shadow-blue-200"
                    icon={<ArrowRight size={20} />}
                  >
                    Start Translation
                  </Button>
                </div>
              ) : state.status === TranslationStatus.ERROR ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-red-600">
                  <AlertTriangle size={48} className="mb-4" />
                  <h3 className="text-lg font-bold mb-2">Translation Failed</h3>
                  <p className="max-w-md">{state.errorMessage}</p>
                  <Button variant="outline" onClick={handleStartTranslation} className="mt-6">
                    Try Again
                  </Button>
                </div>
              ) : (
                <div 
                  dir="rtl" 
                  className="flex-1 overflow-y-auto p-8 custom-scrollbar font-arabic text-lg leading-loose text-slate-800"
                >
                  {state.status === TranslationStatus.READING_FILE && (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
                       <Loader2 size={40} className="animate-spin text-blue-500" />
                       <p>Reading file contents... (Large files may take a moment)</p>
                    </div>
                  )}
                  
                  {(state.status === TranslationStatus.TRANSLATING || state.status === TranslationStatus.COMPLETED) && (
                     <div className="prose prose-lg prose-slate max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-p:text-slate-800 prose-img:rounded-xl">
                        <ReactMarkdown>
                          {state.translatedText || "Generating translation..."}
                        </ReactMarkdown>
                        {state.status === TranslationStatus.TRANSLATING && (
                          <div className="mt-8 flex justify-center py-4 border-t border-slate-100">
                            <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-bounce mx-1"></span>
                            <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-bounce mx-1 delay-100"></span>
                            <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-bounce mx-1 delay-200"></span>
                          </div>
                        )}
                        {state.status === TranslationStatus.COMPLETED && (
                          <div className="mt-8 p-4 bg-emerald-50 rounded-lg text-center">
                            <p className="text-emerald-700 font-medium mb-3">Translation Completed!</p>
                            <Button onClick={handleDownload} variant="secondary" icon={<Download size={16}/>}>
                               Download Translated Book
                            </Button>
                          </div>
                        )}
                     </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;