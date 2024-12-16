import { readFile, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'
import { UPLOAD_DIR } from '~/constants'

const BodySchema = z.object({
	uploadId: z.string(),
	parts: z.array(
		z.object({
			partNumber: z.number(),
			etag: z.string(),
		}),
	),
	fileName: z.string(),
})

export default defineEventHandler(async (event) => {
	const { uploadId, parts, fileName } = await readValidatedBody(event, BodySchema.parse)
	const uploadDir = join(UPLOAD_DIR, uploadId)

	// Sort parts by part number
	parts.sort((a, b) => a.partNumber - b.partNumber)

	// 先读取所有分片
	const chunks = await Promise.all(
		parts.map(async (part) => {
			const chunkPath = join(uploadDir, `part_${part.partNumber}`)
			return readFile(chunkPath)
		}),
	)

	const finalBuffer = Buffer.concat(chunks)
	const finalPath = join(uploadDir, fileName)
	await writeFile(finalPath, finalBuffer)

	// 文件写入成功后，再删除分片
	await Promise.all(
		parts.map(async (part) => {
			const chunkPath = join(uploadDir, `part_${part.partNumber}`)
			await unlink(chunkPath).catch(console.error)
		}),
	)

	return {
		success: true,
		id: uploadId,
	}
})
