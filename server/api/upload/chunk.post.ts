import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import type { IncomingMessage } from 'node:http'
import { join } from 'node:path'
import formidable from 'formidable'
import { UPLOAD_DIR } from '~/constants'

export default defineEventHandler(async (event) => {
	const form = formidable({
		maxFileSize: 100 * 1024 * 1024, // 100MB per chunk
	})

	const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
		form.parse(event.node.req as IncomingMessage, (err, fields, files) => {
			if (err) reject(err)
			else resolve([fields, files])
		})
	})

	const uploadId = fields.uploadId?.[0]
	const partNumber = fields.partNumber?.[0]

	if (!uploadId || !partNumber) {
		throw createError({
			statusCode: 400,
			message: 'Missing uploadId or partNumber',
		})
	}

	const uploadedFile = files.file?.[0]
	if (!uploadedFile) {
		throw createError({
			statusCode: 400,
			message: 'No file found in request',
		})
	}

	const uploadDir = join(UPLOAD_DIR, uploadId)
	const chunkPath = join(uploadDir, `part_${partNumber}`)

	// Calculate MD5 hash of the chunk
	const hash = createHash('md5')
	const buffer = await readFile(uploadedFile.filepath)
	hash.update(buffer)
	const etag = hash.digest('hex')

	// Move chunk to final location
	await writeFile(chunkPath, buffer)

	return {
		success: true,
		partNumber: Number.parseInt(partNumber),
		etag,
	}
})
