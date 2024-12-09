import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { type RenderMediaOnProgress, renderMedia, selectComposition } from '@remotion/renderer'
import extract from 'extract-zip'
import { z } from 'zod'
import { BUNDLE_DIR, EXTRACT_DIR, OUTPUT_FILE, PROGRESS_FILE, RENDER_INFO_FILE, UPLOAD_DIR } from '~/constants'

const BodySchema = z.object({
	id: z.string(),
	fileName: z.string(),
})

function createWriteRenderOnProgress(id: string, compositionId: string): RenderMediaOnProgress {
	return async ({ progress }) => {
		const message = `${compositionId}-${id}-${(progress * 100).toFixed(2)}%`
		const targetDir = join(UPLOAD_DIR, id)
		const progressFilePath = join(targetDir, PROGRESS_FILE)
		await writeFile(progressFilePath, JSON.stringify({ progress: message }))
		console.log(message)
	}
}

async function render(id: string, renderInfo: Record<string, any>, outputLocation: string, extractDir: string) {
	const { compositionId, inputProps, composition: compositionInfo } = renderInfo
	const bundleDir = join(extractDir, BUNDLE_DIR)
	const composition = await selectComposition({
		serveUrl: bundleDir,
		id: compositionId,
		inputProps,
	})

	composition.durationInFrames = compositionInfo.durationInFrames
	composition.fps = compositionInfo.fps
	composition.height = compositionInfo.height
	composition.width = compositionInfo.width

	await renderMedia({
		composition,
		serveUrl: bundleDir,
		codec: 'h264',
		outputLocation,
		inputProps,
		onProgress: throttle(createWriteRenderOnProgress(id, compositionId), 2000, {
			trailing: true,
		}),
	})
}

export default eventHandler(async (event) => {
	const { id, fileName } = await readValidatedBody(event, BodySchema.parse)
	const targetDir = join(UPLOAD_DIR, id)
	const filePath = join(targetDir, fileName)
	const extractDir = join(targetDir, EXTRACT_DIR)
	await extract(filePath, { dir: extractDir })

	const renderInfoPath = join(extractDir, RENDER_INFO_FILE)
	const renderInfo = JSON.parse(await readFile(renderInfoPath, 'utf-8'))

	const outputLocation = join(targetDir, OUTPUT_FILE)

	render(id, renderInfo, outputLocation, extractDir)

	return {
		id,
	}
})
