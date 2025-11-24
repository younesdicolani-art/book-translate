import React, { useCallback, useState } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from '../types';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, isLoading }) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const validateAndPassFile = (file: File) => {
    setError(null);
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`File is too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are currently supported.');
      return;
    }
    onFileSelect(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndPassFile(e.dataTransfer.files[0]);
    }
  }, [onFileSelect]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndPassFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-10">
      <div
        className={`relative group border-2 border-dashed rounded-2xl p-12 transition-all duration-300 ease-in-out text-center cursor-pointer
        ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}
        ${isLoading ? 'pointer-events-none opacity-50' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleChange}
          accept="application/pdf"
          disabled={isLoading}
        />
        
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className={`p-4 rounded-full bg-blue-100 text-blue-600 transition-transform group-hover:scale-110`}>
            <Upload size={40} />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-slate-800">
              Upload your Book (PDF)
            </h3>
            <p className="text-slate-500 text-sm">
              Drag & drop or click to browse
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-400 font-medium bg-slate-100 px-3 py-1 rounded-full">
            <FileText size={14} />
            <span>Max size: {MAX_FILE_SIZE_MB} MB</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-center justify-center text-red-500 space-x-2 bg-red-50 p-3 rounded-lg animate-fade-in">
          <AlertCircle size={18} />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}
    </div>
  );
};
