import { Queue } from 'bullmq'
import { REDIS_URL, RENDER_QUEUE_NAME } from '~/constants'

export const renderQueue = new Queue(RENDER_QUEUE_NAME, {
	connection: {
		url: REDIS_URL,
	},
})
