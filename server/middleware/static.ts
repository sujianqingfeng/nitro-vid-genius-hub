import { createReadStream } from 'node:fs'
import { join } from 'node:path'
import { UPLOAD_DIR } from '~/constants'

export default defineEventHandler((event) => {
	// 检查是否是remotion静态资源请求
	if (event.path.startsWith('/_remotion/')) {
		const parts = event.path.split('/')
		const id = parts[2]
		const remainingPath = parts.slice(3).join('/')

		// 设置正确的文件路径
		const filePath = join(UPLOAD_DIR, id, 'dist', remainingPath)

		// 设置静态文件服务
		setResponseHeaders(event, {
			'Cache-Control': 'public, max-age=0',
		})

		return sendStream(event, createReadStream(filePath))
	}
})
