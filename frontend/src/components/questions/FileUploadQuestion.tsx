'use client';

import { useState, useRef } from 'react';

interface FileUploadQuestionProps {
  question: {
    content: {
      allowedFileTypes?: string[];
      maxFileSize?: number; // in MB
      maxFiles?: number;
    };
  };
  value: Array<{
    fileName: string;
    fileUrl: string;
    fileSize: number;
  }> | null;
  onChange: (files: Array<{ fileName: string; fileUrl: string; fileSize: number }>) => void;
  disabled?: boolean;
}

export default function FileUploadQuestion({
  question,
  value = [],
  onChange,
  disabled = false,
}: FileUploadQuestionProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedTypes = question.content.allowedFileTypes || [
    '.pdf',
    '.doc',
    '.docx',
    '.txt',
    '.zip',
    '.jpg',
    '.png',
  ];
  const maxSize = (question.content.maxFileSize || 10) * 1024 * 1024; // Convert MB to bytes
  const maxFiles = question.content.maxFiles || 5;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Check file count
    if (value && value.length + files.length > maxFiles) {
      alert(`You can only upload up to ${maxFiles} files`);
      return;
    }

    setUploading(true);

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        alert('You must be logged in to upload files');
        setUploading(false);
        return;
      }

      // Create FormData to send files
      const formData = new FormData();
      const validFiles: File[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Check file size
        if (file.size > maxSize) {
          alert(`File "${file.name}" is too large. Maximum size is ${question.content.maxFileSize}MB`);
          continue;
        }

        // Check file type
        const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
        if (!allowedTypes.includes(fileExtension)) {
          alert(`File type "${fileExtension}" is not allowed`);
          continue;
        }

        validFiles.push(file);
        formData.append('files', file);
      }

      if (validFiles.length === 0) {
        setUploading(false);
        return;
      }

      // Add questionId (using timestamp as placeholder if not available)
      formData.append('questionId', 'question-' + Date.now());

      // Upload files to backend
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/upload`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }

      const result = await response.json();
      const uploadedFiles = result.data.files;

      onChange([...(value || []), ...uploadedFiles]);
    } catch (error: any) {
      console.error('Error uploading files:', error);
      alert('Failed to upload files: ' + (error.message || 'Unknown error'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeFile = (index: number) => {
    if (!value) return;
    const newFiles = value.filter((_, i) => i !== index);
    onChange(newFiles);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
          uploading
            ? 'border-neon-blue bg-neon-blue/5'
            : 'border-gray-600 hover:border-neon-blue hover:bg-dark-700'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={allowedTypes.join(',')}
          onChange={handleFileSelect}
          disabled={disabled || uploading}
          className="hidden"
        />

        {uploading ? (
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-neon-blue border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-gray-400">Uploading files...</p>
          </div>
        ) : (
          <div>
            <svg
              className="w-16 h-16 mx-auto mb-4 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-white font-medium mb-2">Click to upload files</p>
            <p className="text-sm text-gray-400">
              Allowed types: {allowedTypes.join(', ')}
            </p>
            <p className="text-sm text-gray-400">
              Max size: {question.content.maxFileSize || 10}MB per file
            </p>
            <p className="text-sm text-gray-400">
              Max files: {maxFiles}
            </p>
          </div>
        )}
      </div>

      {/* Uploaded files */}
      {value && value.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-400">Uploaded Files ({value.length})</h4>
          {value.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-dark-700 border border-gray-600 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <svg
                  className="w-6 h-6 text-neon-blue"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <div>
                  <p className="text-white text-sm font-medium">{file.fileName}</p>
                  <p className="text-gray-400 text-xs">{formatFileSize(file.fileSize)}</p>
                </div>
              </div>
              {!disabled && (
                <button
                  onClick={() => removeFile(index)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
