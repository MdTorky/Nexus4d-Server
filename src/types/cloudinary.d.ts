declare module 'cloudinary' {
    export interface UploadApiOptions {
        resource_type?: 'image' | 'video' | 'raw' | 'auto';
        overwrite?: boolean;
        public_id?: string;
        folder?: string;
        format?: string;
        allowed_formats?: string[];
        transformation?: any;
    }

    export interface UploadApiResponse {
        public_id: string;
        version: number;
        signature: string;
        width: number;
        height: number;
        format: string;
        resource_type: string;
        created_at: string;
        tags: string[];
        bytes: number;
        type: string;
        etag: string;
        placeholder: boolean;
        url: string;
        secure_url: string;
        original_filename: string;
        access_mode: string;
        [key: string]: any;
    }

    export interface ConfigOptions {
        cloud_name?: string;
        api_key?: string;
        api_secret?: string;
        [key: string]: any;
    }

    export const v2: {
        config: (options: ConfigOptions) => void;
        uploader: {
            upload: (
                file: string, 
                options?: UploadApiOptions, 
                callback?: (error: any, result: UploadApiResponse) => void
            ) => Promise<UploadApiResponse>;
            destroy: (
                public_id: string,
                options?: any,
                callback?: (error: any, result: any) => void
            ) => Promise<any>;
        };
        url: (publicId: string, options?: any) => string;
    };
}
