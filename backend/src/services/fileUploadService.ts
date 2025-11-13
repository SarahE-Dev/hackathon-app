import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { existsSync } from 'fs';

export interface UploadedFile {
  fileName: string;
  fileUrl: string;
  fileSize: number;
  uploadedAt: Date;
}

export class FileUploadService {
  // Directory where files will be stored
  private static readonly UPLOAD_DIR = join(process.cwd(), 'uploads', 'assessments');

  // Maximum file size in bytes (default 10MB)
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024;

  // Allowed file extensions
  private static readonly ALLOWED_EXTENSIONS = [
    '.pdf', '.doc', '.docx', '.txt', '.zip',
    '.jpg', '.jpeg', '.png', '.gif',
    '.csv', '.xlsx', '.xls',
    '.py', '.js', '.java', '.cpp', '.c'
  ];

  /**
   * Initialize upload directory
   */
  static async initializeUploadDirectory(): Promise<void> {
    try {
      if (!existsSync(this.UPLOAD_DIR)) {
        await mkdir(this.UPLOAD_DIR, { recursive: true });
      }
    } catch (error) {
      console.error('Error creating upload directory:', error);
      throw error;
    }
  }

  /**
   * Upload a file
   */
  static async uploadFile(
    fileBuffer: Buffer,
    originalFileName: string,
    userId: string,
    questionId: string
  ): Promise<UploadedFile> {
    // Validate file size
    if (fileBuffer.length > this.MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    // Validate file extension
    const fileExtension = this.getFileExtension(originalFileName);
    if (!this.ALLOWED_EXTENSIONS.includes(fileExtension)) {
      throw new Error(`File type ${fileExtension} is not allowed`);
    }

    // Generate unique filename
    const uniqueFileName = `${uuidv4()}-${originalFileName}`;
    const filePath = join(this.UPLOAD_DIR, uniqueFileName);

    try {
      // Ensure upload directory exists
      await this.initializeUploadDirectory();

      // Write file to disk
      await writeFile(filePath, fileBuffer);

      // Construct file URL (relative to server)
      const fileUrl = `/api/uploads/assessments/${uniqueFileName}`;

      return {
        fileName: originalFileName,
        fileUrl,
        fileSize: fileBuffer.length,
        uploadedAt: new Date(),
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error('Failed to upload file');
    }
  }

  /**
   * Upload multiple files
   */
  static async uploadMultipleFiles(
    files: Array<{ buffer: Buffer; originalName: string }>,
    userId: string,
    questionId: string
  ): Promise<UploadedFile[]> {
    const uploadedFiles: UploadedFile[] = [];

    for (const file of files) {
      try {
        const uploadedFile = await this.uploadFile(
          file.buffer,
          file.originalName,
          userId,
          questionId
        );
        uploadedFiles.push(uploadedFile);
      } catch (error) {
        console.error(`Failed to upload file ${file.originalName}:`, error);
        // Continue with other files
      }
    }

    return uploadedFiles;
  }

  /**
   * Get file extension from filename
   */
  private static getFileExtension(fileName: string): string {
    const parts = fileName.split('.');
    if (parts.length < 2) return '';
    return '.' + parts[parts.length - 1].toLowerCase();
  }

  /**
   * Validate file type
   */
  static isValidFileType(fileName: string): boolean {
    const extension = this.getFileExtension(fileName);
    return this.ALLOWED_EXTENSIONS.includes(extension);
  }

  /**
   * Get file path from URL
   */
  static getFilePathFromUrl(fileUrl: string): string {
    const fileName = fileUrl.split('/').pop() || '';
    return join(this.UPLOAD_DIR, fileName);
  }
}

export default FileUploadService;
