import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

// Check if credentials exist
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    console.warn("⚠️ R2 Credentials missing in .env. Video uploads will fail.");
}

const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID || '',
        secretAccessKey: R2_SECRET_ACCESS_KEY || '',
    },
});

export const R2Service = {
    /**
     * Uploads a file buffer to R2
     * @param file Express Multer File
     * @param folder Folder path in bucket (e.g., 'courses/courseId')
     */
    uploadFile: async (file: Express.Multer.File, folder: string): Promise<string> => {
        // Sanitize: Use Timestamp-RandomString.Extension to avoid encoding issues with Arabic/Special chars
        const ext = file.originalname.split('.').pop() || 'file';
        const safeName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
        const fileName = `${folder}/${safeName}`;
        
        try {
            await r2Client.send(new PutObjectCommand({
                Bucket: R2_BUCKET_NAME,
                Key: fileName,
                Body: file.buffer,
                ContentType: file.mimetype,
            }));

            // Return the Public URL
            // Ensure you have a Custom Domain or R2.dev subdomain setup for public access
            // For now, assuming R2.dev subdomain or similar pattern. 
            // Better to use a specific Public Domain env var
            const publicDomain = process.env.R2_PUBLIC_DOMAIN; 
            if (!publicDomain) {
                throw new Error("R2_PUBLIC_DOMAIN not set in .env");
            }

            return `${publicDomain}/${fileName}`;
        } catch (error) {
            console.error("R2 Upload Error:", error);
            throw new Error("Failed to upload file to R2");
        }
    },

    deleteFile: async (fileUrl: string) => {
        try {
           // Extract Key from URL
           // Example: https://pub-xxx.r2.dev/courses/123/video.mp4
           // Key: courses/123/video.mp4
           const publicDomain = process.env.R2_PUBLIC_DOMAIN || '';
           const key = fileUrl.replace(`${publicDomain}/`, '');

           await r2Client.send(new DeleteObjectCommand({
               Bucket: R2_BUCKET_NAME,
               Key: key
           }));
        } catch (error) {
            console.error("R2 Delete Error:", error);
        }
    }
};
