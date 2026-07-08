import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs/promises';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadToCloudinary(filePath: string): Promise<string> {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'payments',
      resource_type: 'auto',
    });
    // Delete local file after upload
    await fs.unlink(filePath).catch(() => {});
    return result.secure_url;
  } catch (err) {
    // Delete local file in case of error as well
    await fs.unlink(filePath).catch(() => {});
    throw err;
  }
}
