import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  constructor(private configService: ConfigService) {
    // Configure Cloudinary
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  /**
   * Upload a file buffer to Cloudinary
   * @param file - Multer file object
   * @param folder - Optional folder path in Cloudinary
   * @param options - Additional Cloudinary upload options
   * @returns Promise with upload result containing secure_url
   */
  async uploadFile(
    file: Express.Multer.File,
    folder?: string,
    options?: {
      width?: number;
      height?: number;
      crop?: string;
      format?: string;
      quality?: number;
    },
  ): Promise<{
    url: string;
    publicId: string;
    format: string;
    bytes: number;
  }> {
    return new Promise((resolve, reject) => {
      // Convert buffer to stream
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: folder || 'ivisa123',
          resource_type: 'auto',
          ...options,
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else if (!result) {
            reject(new Error('Upload failed: No result returned from Cloudinary'));
          } else {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              format: result.format,
              bytes: result.bytes,
            });
          }
        },
      );

      // Create readable stream from buffer
      const bufferStream = new Readable();
      bufferStream.push(file.buffer);
      bufferStream.push(null);

      // Pipe buffer stream to Cloudinary
      bufferStream.pipe(stream);
    });
  }

  /**
   * Upload an image buffer (already resized, just uploads to Cloudinary)
   * @param file - Multer file object
   * @param folder - Optional folder path in Cloudinary
   * @param width - Target width (for metadata, actual resize should be done before upload)
   * @param height - Target height (for metadata, actual resize should be done before upload)
   * @returns Promise with upload result
   */
  async uploadImageWithResize(
    file: Express.Multer.File,
    folder?: string,
    width?: number,
    height?: number,
  ): Promise<{
    url: string;
    publicId: string;
    format: string;
    bytes: number;
  }> {
    // Upload the already-resized image
    return this.uploadFile(file, folder, {
      quality: 90, // Good quality for resized images
    });
  }

  /**
   * Delete a file from Cloudinary
   * @param publicId - Public ID of the file to delete
   * @returns Promise with deletion result
   */
  async deleteFile(publicId: string): Promise<any> {
    return cloudinary.uploader.destroy(publicId);
  }
}

