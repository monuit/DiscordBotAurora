const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const { v4: uuidv4 } = require('uuid');

const endpoint = process.env.SPACES_ENDPOINT;
const origin = process.env.SPACES_ORIGIN; // optional friendly origin
const accessKeyId = process.env.SPACES_KEY_ID;
const secretAccessKey = process.env.SPACES_SECRET;
const keyName = process.env.SPACES_KEY_NAME || '';

if (!endpoint || !accessKeyId || !secretAccessKey) {
    console.warn('[SpacesUploader] Missing SPACES_* env vars. Uploads will fail until configured.');
}

function buildS3Client() {
    const s3Config = {
        region: 'us-east-1',
        endpoint: `https://${endpoint}`,
        credentials: { accessKeyId, secretAccessKey },
        forcePathStyle: false
    };
    return new S3Client(s3Config);
}

async function uploadFile(localPath, opts = {}) {
    const bucket = opts.bucket || keyName;
    if (!bucket) throw new Error('No bucket/key name configured (SPACES_KEY_NAME)');
    if (!fs.existsSync(localPath)) throw new Error('File not found: ' + localPath);

    const s3 = buildS3Client();
    const fileStream = fs.createReadStream(localPath);
    const ext = path.extname(localPath) || '.mp4';
    const objectKey = `${Date.now()}_${uuidv4()}${ext}`;

    const uploadParams = {
        Bucket: bucket,
        Key: objectKey,
        Body: fileStream,
        ACL: 'public-read',
        ContentType: opts.contentType || 'video/mp4'
    };

    const parallelUpload = new Upload({ client: s3, params: uploadParams });

    return parallelUpload.done().then(data => {
        const publicUrl = origin ? `${origin.replace(/\/$/, '')}/${objectKey}` : `https://${bucket}.${endpoint.replace(/^https?:\/\//, '')}/${objectKey}`;
        return { url: publicUrl, key: objectKey };
    });
}

module.exports = { uploadFile };
