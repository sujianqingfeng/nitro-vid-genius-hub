import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { type RenderMediaOnProgress, renderMedia, selectComposition } from '@remotion/renderer'
import extract from 'extract-zip'
import { z } from 'zod'
import { EXTRACT_DIR, OUTPUT_FILE, RENDER_INFO_FILE, UPLOAD_DIR } from '~/constants'

const BodySchema = z.object({
	id: z.string(),
	fileName: z.string(),
})

export const renderOnProgress: RenderMediaOnProgress = ({ progress }) => {
	console.log(`Rendering is ${progress * 100}% complete`)
}

export const throttleRenderOnProgress = throttle(renderOnProgress, 2000, {
	trailing: true,
})

async function render(id: string, compositionId: string, inputProps: Record<string, any>, outputLocation: string) {
	// 创建静态服务器并获取端口号
	const port = await createStaticServer(id)
	const serveUrl = `http://localhost:${port}/index.html`

	console.log('🚀 ~ eventHandler ~ serveUrl:', serveUrl)
	try {
		const composition = await selectComposition({
			serveUrl,
			id: compositionId,
			inputProps,
		})

		await renderMedia({
			composition,
			serveUrl,
			codec: 'h264',
			outputLocation,
			inputProps,
			onProgress: throttleRenderOnProgress,
		})
	} finally {
		// 渲染完成后关闭静态服务器
		closeStaticServer(id)
	}
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

	const { compositionId, inputProps } = renderInfo
	render(id, compositionId, inputProps, outputLocation)

	return {
		success: true,
		message: 'add render success',
	}
})
