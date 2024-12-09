import { randomUUID } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import type { IncomingMessage } from 'node:http'
import { join } from 'node:path'
import formidable, { type File } from 'formidable'
import { UPLOAD_DIR } from '~/constants'

export default defineEventHandler(async (event) => {
	const dirId = randomUUID()
	const uploadDir = join(UPLOAD_DIR, dirId)
	await mkdir(uploadDir, { recursive: true })

	const form = formidable({
		uploadDir,
		keepExtensions: true,
		maxFileSize: 500 * 1024 * 1024,
		filename: (name, ext) => name + ext,
	})

	const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
		form.parse(event.node.req as IncomingMessage, (err, fields, files) => {
			if (err) reject(err)
			else resolve([fields, files])
		})
	})

	const uploadedFiles = files.file as File | File[]
	if (!uploadedFiles) {
		throw createError({
			statusCode: 400,
			message: 'No file found in request',
		})
	}

	return {
		success: true,
		message: 'File upload successful',
		id: dirId,
		files: Array.isArray(uploadedFiles)
			? uploadedFiles.map((f) => ({ name: f.originalFilename, size: f.size }))
			: [{ name: uploadedFiles.originalFilename, size: uploadedFiles.size }],
	}
})
