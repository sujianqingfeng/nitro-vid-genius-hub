import { randomUUID } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'
import { UPLOAD_DIR } from '~/constants'

const BodySchema = z.object({
	fileName: z.string(),
	fileSize: z.number(),
})

export default defineEventHandler(async (event) => {
	const { fileName, fileSize } = await readValidatedBody(event, BodySchema.parse)
	const uploadId = randomUUID()
	const uploadDir = join(UPLOAD_DIR, uploadId)
	await mkdir(uploadDir, { recursive: true })

	return {
		uploadId,
		fileName,
		fileSize,
	}
})
