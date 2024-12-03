import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { UPLOAD_DIR } from '~/constants'

export default defineEventHandler(async (event) => {
	try {
		const formData = await readMultipartFormData(event)
		if (!formData || formData.length === 0) {
			throw createError({
				statusCode: 400,
				message: 'not found file',
			})
		}

		const dirId = randomUUID()

		const uploadDir = join(UPLOAD_DIR, dirId)
		await mkdir(uploadDir, { recursive: true })

		for (const file of formData) {
			if (file.filename && file.data) {
				const filePath = join(uploadDir, file.filename)
				await writeFile(filePath, file.data)
			}
		}

		return {
			success: true,
			message: 'file upload success',
			id: dirId,
		}
	} catch (error) {
		throw createError({
			statusCode: 500,
			message: 'file upload failed',
		})
	}
})
