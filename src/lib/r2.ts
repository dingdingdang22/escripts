import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '';
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '';

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

export const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || '';
export const PUBLIC_R2_URL = process.env.NEXT_PUBLIC_R2_URL || ''; 

/**
 * 上传音频 buffer 到 Cloudflare R2
 * @param buffer 音频文件 Buffer
 * @param filename 期望的文件名 (可选)
 * @returns 最终的完整可访问 URL
 */
export async function uploadAudioToR2(buffer: Buffer, filename?: string): Promise<string> {
  const fileId = filename || `${uuidv4()}.mp3`;
  
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileId,
    Body: buffer,
    ContentType: 'audio/mpeg',
  });

  await r2Client.send(command);
  
  return `${PUBLIC_R2_URL}/${fileId}`;
}

/**
 * 列出 R2 中的知识点 Markdown 文件
 */
export async function listKnowledgeBaseFiles(prefix: string = 'englishtest/kb/English/') {
  const command = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: prefix,
  });
  
  const response = await r2Client.send(command);
  return response.Contents || [];
}
