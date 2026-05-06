const multer = require("multer");
const multerS3 = require("multer-s3");
const s3 = require("../utils/s3");

const bucket = process.env.AWS_BUCKET || process.env.AWS_S3_BUCKET;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_KEY_ID;
const canUseS3Uploads =
  Boolean(bucket) &&
  Boolean(process.env.AWS_REGION) &&
  Boolean(accessKeyId) &&
  Boolean(secretAccessKey);

if (!canUseS3Uploads) {
  console.warn(
    "S3 upload is not fully configured. Upload endpoints will reject files until AWS env vars are set."
  );
}
const imageFilter = (req, file, cb) => {
  if (/^image\/(jpeg|png|gif|webp)$/i.test(file.mimetype)) cb(null, true);
  else cb(new Error("Only images (JPEG, PNG, GIF, WebP) are allowed"), false);
};

const disabledStorage = multer.memoryStorage();
const uploadUnavailableError = (req, file, cb) => {
  cb(new Error("Upload service is not configured on server"));
};

function createStorage(keyPrefix, fallbackName) {
  if (!canUseS3Uploads) return disabledStorage;
  return multerS3({
    s3,
    bucket,
    metadata: (req, file, cb) => cb(null, { fieldName: file.fieldname }),
    key: (req, file, cb) => {
      const name = file.originalname || fallbackName;
      const safe = name.replace(/[^a-zA-Z0-9.-]/g, "_");
      cb(null, `${keyPrefix}/${Date.now()}-${safe}`);
    },
  });
}

const storeLogoS3 = createStorage("store-logos", "logo");


const productImageS3 = createStorage("products", "image");


const variantImageS3 = createStorage("variants", "image");

const uploadStoreLogo = multer({
  storage: storeLogoS3,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: canUseS3Uploads ? imageFilter : uploadUnavailableError,
});

const uploadProductImage = multer({
  storage: productImageS3,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: canUseS3Uploads ? imageFilter : uploadUnavailableError,
});

const uploadVariantImage = multer({
  storage: variantImageS3,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: canUseS3Uploads ? imageFilter : uploadUnavailableError,
});

module.exports = {
  uploadStoreLogo,
  uploadProductImage,
  uploadVariantImage,
};