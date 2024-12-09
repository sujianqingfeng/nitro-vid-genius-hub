import { Job } from 'bullmq'
import { z } from 'zod'
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

	const state = await job.getState()
	const progress = job.progress

	return {
		id: job.id,
		state,
		progress,
		data: job.data,
		timestamp: job.timestamp,
	}
})
