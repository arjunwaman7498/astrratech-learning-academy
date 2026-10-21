import multer from "multer";
import { v2 as cloudinary } from "cloudinary";

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const imageTypes = [
  {
    mimeTypes: ["image/jpeg"],
    extension: "jpg",
    matches: buffer => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  },
  {
    mimeTypes: ["image/png"],
    extension: "png",
    matches: buffer => buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  },
  {
    mimeTypes: ["image/webp"],
    extension: "webp",
    matches: buffer => buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP"
  },
  {
    mimeTypes: ["image/gif"],
    extension: "gif",
    matches: buffer => buffer.length >= 6 && ["GIF87a", "GIF89a"].includes(buffer.toString("ascii", 0, 6))
  },
  {
    mimeTypes: ["image/bmp", "image/x-ms-bmp"],
    extension: "bmp",
    matches: buffer => buffer.length >= 2 && buffer[0] === 0x42 && buffer[1] === 0x4d
  },
  {
    mimeTypes: ["image/avif"],
    extension: "avif",
    matches: buffer => buffer.length >= 12 &&
      buffer.toString("ascii", 4, 8) === "ftyp" &&
      ["avif", "avis"].includes(buffer.toString("ascii", 8, 12))
  }
];

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE, files: 1, fields: 0, parts: 1 }
});

export function getValidatedImageType(file) {
  const type = imageTypes.find(candidate => candidate.matches(file.buffer));
  if (!type || !type.mimeTypes.includes(file.mimetype.toLowerCase())) {
    throw new Error("Unsupported or invalid image. Use a valid JPEG, PNG, WebP, GIF, BMP, or AVIF image.");
  }
  return type;
}

export function hasCloudinaryConfiguration(env = process.env) {
  return ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]
    .every(key => typeof env[key] === "string" && env[key].trim().length > 0);
}

export function uploadImageToCloudinary(buffer, env = process.env, client = cloudinary) {
  if (!hasCloudinaryConfiguration(env)) {
    throw new Error("Cloudinary image storage is not configured.");
  }

  client.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME.trim(),
    api_key: env.CLOUDINARY_API_KEY.trim(),
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true
  });

  return new Promise((resolve, reject) => {
    const upload = client.uploader.upload_stream({
      resource_type: "image",
      folder: "astratech-academy",
      allowed_formats: ["jpg", "jpeg", "png", "webp", "gif", "bmp", "avif"],
      unique_filename: true,
      overwrite: false
    }, (error, result) => {
      if (error) return reject(new Error("Cloudinary could not store the uploaded image."));
      if (typeof result?.secure_url !== "string" || !result.secure_url.startsWith("https://")) {
        return reject(new Error("Cloudinary did not return a secure image URL."));
      }
      resolve(result.secure_url);
    });
    upload.end(buffer);
  });
}
