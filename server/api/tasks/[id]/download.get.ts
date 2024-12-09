import { createReadStream } from 'node:fs'
import { join } from 'node:path'
import { Job } from 'bullmq'
import { sendStream } from 'h3'
import { z } from 'zod'
import { OUTPUT_FILE, UPLOAD_DIR } from '~/constants'
import { renderQueue } from '~/lib/mq'

const PathSchema = z.object({
	id: z.string(),
})

export default eventHandler(async (event) => {
	const { id } = await getValidatedRouterParams(event, PathSchema.parse)

	const job = await Job.fromId(renderQueue, id)

	if (!job) {
		throw createError({
			statusCode: 404,
			message: 'Job not found',
		})
	}

	const targetDir = join(UPLOAD_DIR, job.data.id)
	const filePath = join(targetDir, OUTPUT_FILE)

	const filename = `${id}.mp4`
	setHeaders(event, {
		'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
	})

	return sendStream(event, createReadStream(filePath))
})
