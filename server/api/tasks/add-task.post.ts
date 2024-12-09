import { z } from 'zod'
import { renderQueue } from '~/lib/mq'

const BodySchema = z.object({
	id: z.string(),
	fileName: z.string(),
	jobName: z.string(),
})

export default eventHandler(async (event) => {
	const { id, fileName, jobName } = await readValidatedBody(event, BodySchema.parse)
	const job = await renderQueue.add(jobName, { id, fileName }, { attempts: 1 })
	return {
		jobId: job.id,
		id,
	}
})
