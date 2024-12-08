import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'
import { PROGRESS_FILE, UPLOAD_DIR } from '~/constants'

const PathSchema = z.object({
	id: z.string(),
})

export default eventHandler(async (event) => {
	const { id } = await getValidatedRouterParams(event, PathSchema.parse)

	const targetDir = join(UPLOAD_DIR, id)
	const filePath = join(targetDir, PROGRESS_FILE)

	if (!(await fileExists(filePath))) {
		return {
			progress: '',
		}
	}

	const progressString = await readFile(filePath, 'utf-8')
	const progress = JSON.parse(progressString)

	return progress
})
