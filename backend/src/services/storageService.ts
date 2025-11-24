import { writeFile, mkdir, unlink, readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync, createWriteStream } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger } from '../utils/logger';

export type StorageProvider = 's3' | 'local';

export interface StorageConfig {
  provider: StorageProvider;
  s3?: {
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
  local?: {
    basePath: string;
  };
}

export interface UploadResult {
  storageKey: string;
  bucket?: string;
  size: number;
  url: string;
}

export interface PresignedUploadUrl {
  uploadUrl: string;
  storageKey: string;
  expiresIn: number;
}

export interface MultipartUpload {
  uploadId: string;
  storageKey: string;
  bucket: string;
}

export class StorageService {
  private static instance: StorageService;
  private s3Client: S3Client | null = null;
  private config: StorageConfig;

  private constructor() {
    this.config = this.loadConfig();
    if (this.config.provider === 's3' && this.config.s3) {
      this.s3Client = new S3Client({
        region: this.config.s3.region,
        credentials: {
          accessKeyId: this.config.s3.accessKeyId,
          secretAccessKey: this.config.s3.secretAccessKey,
        },
      });
    }
  }

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  private loadConfig(): StorageConfig {
    const hasS3Config =
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.S3_BUCKET_NAME;

    if (hasS3Config) {
      return {
        provider: 's3',
        s3: {
          region: process.env.AWS_REGION || 'us-east-1',
          bucket: process.env.S3_BUCKET_NAME!,
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      };
    }

    // Fallback to local storage
    return {
      provider: 'local',
      local: {
        basePath: join(process.cwd(), 'uploads', 'recordings'),
      },
    };
  }

  /**
   * Get current storage provider
   */
  getProvider(): StorageProvider {
    return this.config.provider;
  }

  /**
   * Generate a unique storage key for recordings
   */
  generateStorageKey(
    sourceType: 'assessment' | 'hackathon',
    sourceId: string,
    userId: string,
    recordingType: 'webcam' | 'screen' | 'snapshot',
    extension: string = 'webm'
  ): string {
    const timestamp = Date.now();
    const uniqueId = uuidv4().slice(0, 8);
    return `recordings/${sourceType}/${sourceId}/${userId}/${recordingType}-${timestamp}-${uniqueId}.${extension}`;
  }

  /**
   * Generate storage key for a chunk
   */
  generateChunkKey(
    baseKey: string,
    chunkIndex: number
  ): string {
    const parts = baseKey.split('.');
    const ext = parts.pop();
    return `${parts.join('.')}-chunk-${chunkIndex.toString().padStart(4, '0')}.${ext}`;
  }

  /**
   * Upload a buffer to storage
   */
  async uploadBuffer(
    buffer: Buffer,
    storageKey: string,
    contentType: string = 'video/webm'
  ): Promise<UploadResult> {
    if (this.config.provider === 's3') {
      return this.uploadToS3(buffer, storageKey, contentType);
    }
    return this.uploadToLocal(buffer, storageKey);
  }

  /**
   * Upload to S3
   */
  private async uploadToS3(
    buffer: Buffer,
    storageKey: string,
    contentType: string
  ): Promise<UploadResult> {
    if (!this.s3Client || !this.config.s3) {
      throw new Error('S3 client not configured');
    }

    const command = new PutObjectCommand({
      Bucket: this.config.s3.bucket,
      Key: storageKey,
      Body: buffer,
      ContentType: contentType,
    });

    await this.s3Client.send(command);

    return {
      storageKey,
      bucket: this.config.s3.bucket,
      size: buffer.length,
      url: `https://${this.config.s3.bucket}.s3.${this.config.s3.region}.amazonaws.com/${storageKey}`,
    };
  }

  /**
   * Upload to local filesystem
   */
  private async uploadToLocal(
    buffer: Buffer,
    storageKey: string
  ): Promise<UploadResult> {
    if (!this.config.local) {
      throw new Error('Local storage not configured');
    }

    const filePath = join(this.config.local.basePath, storageKey);
    const dirPath = join(filePath, '..');

    // Ensure directory exists
    if (!existsSync(dirPath)) {
      await mkdir(dirPath, { recursive: true });
    }

    await writeFile(filePath, buffer);

    return {
      storageKey,
      size: buffer.length,
      url: `/api/recordings/file/${storageKey}`,
    };
  }

  /**
   * Get a presigned URL for direct upload (S3 only)
   */
  async getPresignedUploadUrl(
    storageKey: string,
    contentType: string = 'video/webm',
    expiresIn: number = 3600
  ): Promise<PresignedUploadUrl> {
    if (this.config.provider !== 's3' || !this.s3Client || !this.config.s3) {
      throw new Error('Presigned URLs only available with S3 storage');
    }

    const command = new PutObjectCommand({
      Bucket: this.config.s3.bucket,
      Key: storageKey,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn });

    return {
      uploadUrl,
      storageKey,
      expiresIn,
    };
  }

  /**
   * Get a presigned URL for download
   */
  async getPresignedDownloadUrl(
    storageKey: string,
    expiresIn: number = 3600
  ): Promise<string> {
    if (this.config.provider !== 's3' || !this.s3Client || !this.config.s3) {
      // For local storage, return the API endpoint
      return `/api/recordings/file/${storageKey}`;
    }

    const command = new GetObjectCommand({
      Bucket: this.config.s3.bucket,
      Key: storageKey,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  /**
   * Initialize multipart upload (for large recordings)
   */
  async initializeMultipartUpload(
    storageKey: string,
    contentType: string = 'video/webm'
  ): Promise<MultipartUpload> {
    if (this.config.provider !== 's3' || !this.s3Client || !this.config.s3) {
      throw new Error('Multipart upload only available with S3 storage');
    }

    const command = new CreateMultipartUploadCommand({
      Bucket: this.config.s3.bucket,
      Key: storageKey,
      ContentType: contentType,
    });

    const response = await this.s3Client.send(command);

    if (!response.UploadId) {
      throw new Error('Failed to initialize multipart upload');
    }

    return {
      uploadId: response.UploadId,
      storageKey,
      bucket: this.config.s3.bucket,
    };
  }

  /**
   * Upload a part in multipart upload
   */
  async uploadPart(
    uploadId: string,
    storageKey: string,
    partNumber: number,
    buffer: Buffer
  ): Promise<{ ETag: string; PartNumber: number }> {
    if (this.config.provider !== 's3' || !this.s3Client || !this.config.s3) {
      throw new Error('Multipart upload only available with S3 storage');
    }

    const command = new UploadPartCommand({
      Bucket: this.config.s3.bucket,
      Key: storageKey,
      UploadId: uploadId,
      PartNumber: partNumber,
      Body: buffer,
    });

    const response = await this.s3Client.send(command);

    if (!response.ETag) {
      throw new Error('Failed to upload part');
    }

    return {
      ETag: response.ETag,
      PartNumber: partNumber,
    };
  }

  /**
   * Complete multipart upload
   */
  async completeMultipartUpload(
    uploadId: string,
    storageKey: string,
    parts: Array<{ ETag: string; PartNumber: number }>
  ): Promise<UploadResult> {
    if (this.config.provider !== 's3' || !this.s3Client || !this.config.s3) {
      throw new Error('Multipart upload only available with S3 storage');
    }

    const command = new CompleteMultipartUploadCommand({
      Bucket: this.config.s3.bucket,
      Key: storageKey,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts.sort((a, b) => a.PartNumber - b.PartNumber),
      },
    });

    await this.s3Client.send(command);

    return {
      storageKey,
      bucket: this.config.s3.bucket,
      size: 0, // Size not available after multipart complete
      url: `https://${this.config.s3.bucket}.s3.${this.config.s3.region}.amazonaws.com/${storageKey}`,
    };
  }

  /**
   * Abort multipart upload
   */
  async abortMultipartUpload(
    uploadId: string,
    storageKey: string
  ): Promise<void> {
    if (this.config.provider !== 's3' || !this.s3Client || !this.config.s3) {
      return;
    }

    const command = new AbortMultipartUploadCommand({
      Bucket: this.config.s3.bucket,
      Key: storageKey,
      UploadId: uploadId,
    });

    await this.s3Client.send(command);
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(storageKey: string): Promise<void> {
    if (this.config.provider === 's3') {
      await this.deleteFromS3(storageKey);
    } else {
      await this.deleteFromLocal(storageKey);
    }
  }

  /**
   * Delete from S3
   */
  private async deleteFromS3(storageKey: string): Promise<void> {
    if (!this.s3Client || !this.config.s3) {
      throw new Error('S3 client not configured');
    }

    const command = new DeleteObjectCommand({
      Bucket: this.config.s3.bucket,
      Key: storageKey,
    });

    await this.s3Client.send(command);
  }

  /**
   * Delete from local filesystem
   */
  private async deleteFromLocal(storageKey: string): Promise<void> {
    if (!this.config.local) {
      throw new Error('Local storage not configured');
    }

    const filePath = join(this.config.local.basePath, storageKey);
    try {
      await unlink(filePath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      // File doesn't exist, ignore
    }
  }

  /**
   * Read file from local storage (for serving files)
   */
  async readLocalFile(storageKey: string): Promise<Buffer> {
    if (!this.config.local) {
      throw new Error('Local storage not configured');
    }

    const filePath = join(this.config.local.basePath, storageKey);
    return readFile(filePath);
  }

  /**
   * Check if local storage path is valid (security check)
   */
  isValidLocalPath(storageKey: string): boolean {
    if (!this.config.local) return false;

    const filePath = join(this.config.local.basePath, storageKey);
    const normalizedPath = join(filePath);

    // Ensure path is within the base path (prevent directory traversal)
    return normalizedPath.startsWith(this.config.local.basePath);
  }

  /**
   * Initialize local storage directory
   */
  async initializeLocalStorage(): Promise<void> {
    if (this.config.provider !== 'local' || !this.config.local) {
      return;
    }

    if (!existsSync(this.config.local.basePath)) {
      await mkdir(this.config.local.basePath, { recursive: true });
      logger.info(`Created local storage directory: ${this.config.local.basePath}`);
    }
  }
}

export default StorageService;
