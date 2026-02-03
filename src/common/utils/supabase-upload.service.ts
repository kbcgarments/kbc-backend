/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';

/**
 * Type guard to check if value is an error object
 */
function isErrorWithMessage(error: unknown): error is { message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  );
}

/**
 * Extract error message safely from unknown error type
 */
function getErrorMessage(error: unknown): string {
  if (isErrorWithMessage(error)) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error occurred';
}

@Injectable()
export class SupabaseUploadService {
  private readonly client: SupabaseClient;
  private readonly bucket: string;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucketName = process.env.SUPABASE_BUCKET;

    if (!supabaseUrl || !supabaseKey || !bucketName) {
      throw new Error(
        'Missing env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_BUCKET',
      );
    }

    this.client = createClient(supabaseUrl, supabaseKey);
    this.bucket = bucketName;
  }

  /**
   * Upload a single file to Supabase storage
   * @param file - Express Multer file object
   * @returns Public URL of the uploaded file
   * @throws BadRequestException if file is invalid
   * @throws InternalServerErrorException if upload fails
   */
  async uploadFile(file: Express.Multer.File): Promise<string> {
    // Validate file
    this.validateFile(file);

    // Generate unique filename
    const filename = this.generateFilename(file.originalname);

    // Upload to Supabase
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .upload(filename, file.buffer, {
        contentType: file.mimetype,
        cacheControl: 'public, max-age=31536000, immutable',
        upsert: false,
      });

    if (error) {
      throw new InternalServerErrorException(
        `Supabase upload failed: ${getErrorMessage(error)}`,
      );
    }

    if (!data) {
      throw new InternalServerErrorException(
        'Upload succeeded but no data returned from Supabase',
      );
    }

    // Get public URL
    return this.getPublicUrl(filename);
  }

  /**
   * Upload multiple files to Supabase storage
   * @param files - Array of Express Multer file objects
   * @returns Array of public URLs
   */
  async uploadFiles(files: Express.Multer.File[]): Promise<string[]> {
    if (!files || files.length === 0) {
      return [];
    }

    const uploadPromises = files.map((file) => this.uploadFile(file));
    return Promise.all(uploadPromises);
  }

  /**
   * Delete a file from Supabase storage
   * @param filename - Name of the file to delete
   * @throws BadRequestException if filename is invalid
   * @throws InternalServerErrorException if deletion fails
   */
  async deleteFile(filename: string): Promise<void> {
    if (!filename || filename.trim() === '') {
      throw new BadRequestException('Valid filename is required');
    }

    const { error } = await this.client.storage
      .from(this.bucket)
      .remove([filename]);

    if (error) {
      throw new InternalServerErrorException(
        `Supabase delete failed: ${getErrorMessage(error)}`,
      );
    }
  }

  /**
   * Delete multiple files from Supabase storage
   * @param filenames - Array of filenames to delete
   */
  async deleteFiles(filenames: string[]): Promise<void> {
    if (!filenames || filenames.length === 0) {
      return;
    }

    const { error } = await this.client.storage
      .from(this.bucket)
      .remove(filenames);

    if (error) {
      throw new InternalServerErrorException(
        `Supabase bulk delete failed: ${getErrorMessage(error)}`,
      );
    }
  }

  /**
   * Validate uploaded file
   * @param file - File to validate
   * @throws BadRequestException if file is invalid
   */
  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided for upload');
    }

    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('File buffer is empty');
    }

    if (!file.originalname || file.originalname.trim() === '') {
      throw new BadRequestException('File must have a valid name');
    }

    if (!file.mimetype) {
      throw new BadRequestException('File mimetype is missing');
    }
  }

  /**
   * Generate a unique filename with original extension
   * @param originalName - Original filename from upload
   * @returns Unique filename with UUID
   */
  private generateFilename(originalName: string): string {
    const sanitizedName = originalName.trim();
    const ext = sanitizedName.split('.').pop();
    const extension = ext && ext.length > 0 && ext.length < 10 ? ext : 'bin';
    return `${randomUUID()}.${extension}`;
  }

  /**
   * Get public URL for a file
   * @param filename - Name of the file
   * @returns Public URL
   * @throws InternalServerErrorException if URL cannot be generated
   */
  private getPublicUrl(filename: string): string {
    const { data } = this.client.storage
      .from(this.bucket)
      .getPublicUrl(filename);

    if (!data?.publicUrl) {
      throw new InternalServerErrorException(
        'Failed to generate public URL for uploaded file',
      );
    }

    return data.publicUrl;
  }
}
