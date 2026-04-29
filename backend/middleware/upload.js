const multer = require("multer");
const multerS3 = require("multer-s3");
const s3 = require("../utils/s3");

const bucket = process.env.AWS_BUCKET;
const imageFilter = (req, file, cb) => {
  if (/^image\/(jpeg|png|gif|webp)$/i.test(file.mimetype)) cb(null, true);
  else cb(new Error("Only images (JPEG, PNG, GIF, WebP) are allowed"), false);
};

const storeLogoS3 = multerS3({
  s3,
  bucket,
  metadata: (req, file, cb) => cb(null, { fieldName: file.fieldname }),
  key: (req, file, cb) => {
    const name = file.originalname || "logo";
    const safe = name.replace(/[^a-zA-Z0-9.-]/g, "_");
    cb(null, `store-logos/${Date.now()}-${safe}`);
  },
});

const productImageS3 = multerS3({
  s3,
  bucket,
  metadata: (req, file, cb) => cb(null, { fieldName: file.fieldname }),
  key: (req, file, cb) => {
    const name = file.originalname || "image";
    const safe = name.replace(/[^a-zA-Z0-9.-]/g, "_");
    cb(null, `products/${Date.now()}-${safe}`);
  },
});

const variantImageS3 = multerS3({
  s3,
  bucket,
  metadata: (req, file, cb) => cb(null, { fieldName: file.fieldname }),
  key: (req, file, cb) => {
    const name = file.originalname || "image";
    const safe = name.replace(/[^a-zA-Z0-9.-]/g, "_");
    cb(null, `variants/${Date.now()}-${safe}`);
  },
});

const uploadStoreLogo = multer({
  storage: storeLogoS3,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFilter,
});

const uploadProductImage = multer({
  storage: productImageS3,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFilter,
});

const uploadVariantImage = multer({
  storage: variantImageS3,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFilter,
});

module.exports = {
  uploadStoreLogo,
  uploadProductImage,
  uploadVariantImage,
};