/**
 * AWS Services integration (S3 + SES)
 *
 * Re-exports AWS utilities from @be-in-digital/core
 * for file storage and email functionality.
 *
 * @example
 * ```ts
 * // S3 Usage
 * import { createS3Service } from '@/lib/aws'
 *
 * const s3 = createS3Service(config, s3Client)
 * const { url } = await s3.upload(file, { folder: 'products', contentType: file.type })
 *
 * // SES Usage
 * import { createSESService } from '@/lib/aws'
 *
 * const ses = createSESService(config, sesClient)
 * await ses.sendEmail({ to: 'user@example.com', subject: 'Hello', html: '<p>Hi!</p>' })
 * ```
 */

// ============================================================================
// Types
// ============================================================================
export type {
  AWSConfig,
  S3Config,
  SESConfig,
  S3Folder,
} from '@be-in-digital/core'

export {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZES,
  S3_FOLDERS,
  isKnownS3Folder,
} from '@be-in-digital/core'

// ============================================================================
// Media URL policy (private bucket — see aws/media-url)
// ============================================================================
export {
  MEDIA_PROXY_PATH,
  buildMediaUrl,
  mediaKeyFromUrl,
} from '@be-in-digital/core'

// ============================================================================
// S3 Service
// ============================================================================
export type {
  S3Service,
  S3Operations,
  UploadOptions,
  UploadResult,
  PresignedUploadOptions,
  PresignedUploadResult,
  PresignedDownloadResult,
  ObjectMetadata,
  PutObjectParams,
  DeleteObjectParams,
  GetSignedUrlParams,
  HeadObjectParams,
} from '@be-in-digital/core'

export {
  createS3Service,
  validateMimeType,
  validateFileSize,
  getExtensionFromMimeType,
} from '@be-in-digital/core'

// ============================================================================
// SES Service
// ============================================================================
export type {
  SESService,
  SendEmailParams,
  SendEmailResult,
  SendTemplatedEmailParams,
  SendBulkEmailParams,
  SendBulkEmailResult,
  SESOperations,
} from '@be-in-digital/core'

export {
  createSESService,
} from '@be-in-digital/core'

// ============================================================================
// Email Templates
// ============================================================================
export type {
  EmailTemplate,
  OrderConfirmationData,
  SESPasswordResetData,
  WelcomeData,
  PrizeWonData,
  TemplateName,
} from '@be-in-digital/core'

export {
  orderConfirmationTemplate,
  passwordResetTemplate,
  welcomeTemplate,
  prizeWonTemplate,
  sesEmailTemplates,
  getTemplate,
} from '@be-in-digital/core'
