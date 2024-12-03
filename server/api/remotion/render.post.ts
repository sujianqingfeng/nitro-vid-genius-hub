import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { renderMedia, selectComposition } from '@remotion/renderer'
import extract from 'extract-zip'
import { z } from 'zod'
import { UPLOAD_DIR } from '~/constants'

const BodySchema = z.object({
	id: z.string(),
	fileName: z.string(),
})

export default eventHandler(async (event) => {
	const { id, fileName } = await readValidatedBody(event, BodySchema.parse)
	const targetDir = join(UPLOAD_DIR, id)
	const filePath = join(targetDir, fileName)
	const extractDir = join(targetDir, 'dist')
	await extract(filePath, { dir: extractDir })

	const renderInfoPath = join(extractDir, 'render-info.json')
	const renderInfo = JSON.parse(await readFile(renderInfoPath, 'utf-8'))

	const bundleDirPath = join(extractDir, 'bundle')

	// 获取当前服务器的URL
	const config = useRuntimeConfig()
	const serverUrl = `http://localhost:${process.env.PORT || 3000}`

	const { compositionId, inputProps } = renderInfo

	// 使用服务器URL构建静态文件访问路径
	const serveUrl = `${serverUrl}/_remotion/${id}/bundle/index.html`

	console.log('🚀 ~ eventHandler ~ serveUrl:', serveUrl)
	const composition = await selectComposition({
		serveUrl,
		id: compositionId,
		inputProps: inputProps,
	})

	await renderMedia({
		composition,
		serveUrl,
		codec: 'h264',
		outputLocation: `${extractDir}/out.mp4`,
		inputProps,
	})

	console.log('Render done!')

	return {
		success: true,
		message: 'render success',
	}
})
