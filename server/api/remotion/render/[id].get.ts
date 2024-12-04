import { createReadStream } from 'node:fs'
import { join } from 'node:path'
import { sendStream } from 'h3'
import { z } from 'zod'
import { OUTPUT_FILE, UPLOAD_DIR } from '~/constants'

const PathSchema = z.object({
	id: z.string(),
})

export default eventHandler(async (event) => {
	const { id } = await getValidatedRouterParams(event, PathSchema.parse)

	const targetDir = join(UPLOAD_DIR, id)
	const filePath = join(targetDir, OUTPUT_FILE)

	const filename = `${id}.mp4`
	setHeaders(event, {
		'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
	})

	return sendStream(event, createReadStream(filePath))
})
