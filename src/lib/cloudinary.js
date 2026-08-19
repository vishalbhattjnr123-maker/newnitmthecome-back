import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary server-side
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads a file buffer directly to Cloudinary
 * @param {Buffer} fileBuffer - The file buffer to upload
 * @param {string} folder - The destination folder in Cloudinary
 * @param {string} filename - The public ID / filename for the upload
 * @returns {Promise<object>} The Cloudinary upload result
 */
export const uploadToCloudinary = (fileBuffer, folder, filename) => {
    return new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream({
            folder: folder,
            public_id: filename.replace(/\.[^/.]+$/, ""), // strip file extension if present as Cloudinary appends it automatically
            resource_type: 'auto'
        }, (error, result) => {
            if (error) {
                reject(error);
            } else {
                resolve(result);
            }
        }).end(fileBuffer);
    });
};
