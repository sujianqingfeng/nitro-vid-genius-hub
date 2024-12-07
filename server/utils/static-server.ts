import { createReadStream } from 'node:fs'
import { type Server, createServer } from 'node:http'
import { join } from 'node:path'
import { EXTRACT_DIR, UPLOAD_DIR } from '~/constants'
import { fileExists } from './file'

// 存储运行中的服务器实例
const runningServers = new Map<string, { server: Server; port: number }>()

// 生成随机端口号 (9000-9100)
function getRandomPort(): number {
	return Math.floor(Math.random() * 101) + 9000
}

export async function createStaticServer(projectId: string): Promise<number> {
	// 如果已经有该项目的服务器在运行，直接返回端口号
	const existingServer = runningServers.get(projectId)
	if (existingServer) {
		return existingServer.port
	}

	const port = getRandomPort()
	const projectPath = join(UPLOAD_DIR, projectId, EXTRACT_DIR)
	const bundlePath = join(projectPath, 'bundle')
	const publicPath = join(bundlePath, 'public')

	const server = createServer(async (req, res) => {
		if (!req.url) {
			res.writeHead(404)
			res.end('Not found')
			return
		}

		// 解码 URL，移除查询参数
		const pathname = decodeURIComponent(req.url.split('?')[0])

		// 构建文件路径
		let filePath: string

		if (pathname === '/' || pathname === '/index.html') {
			// 对于首页，直接从 bundle 目录加载
			filePath = join(bundlePath, 'index.html')
		} else {
			// 先尝试从 public 目录加载
			const publicFilePath = join(publicPath, pathname.slice(1))
			if (await fileExists(publicFilePath)) {
				filePath = publicFilePath
			} else {
				// 如果在 public 目录中找不到，则从 bundle 目录加载
				filePath = join(bundlePath, pathname)
			}
		}

		// 检查文件是否存在
		if (!(await fileExists(filePath))) {
			console.error(`File not found: ${filePath}`)
			res.writeHead(404)
			res.end('Not found')
			return
		}

		// 创建文件流
		const fileStream = createReadStream(filePath)

		fileStream.on('error', (error) => {
			console.error(`Error reading file ${filePath}:`, error)
			res.writeHead(404)
			res.end('Not found')
		})

		// 根据文件扩展名设置 Content-Type
		const ext = pathname.split('.').pop()?.toLowerCase()
		const contentTypes: Record<string, string> = {
			js: 'application/javascript',
			css: 'text/css',
			html: 'text/html',
			png: 'image/png',
			jpg: 'image/jpeg',
			jpeg: 'image/jpeg',
			gif: 'image/gif',
			svg: 'image/svg+xml',
			mp4: 'video/mp4',
		}
		const contentType = contentTypes[ext ?? ''] || 'application/octet-stream'

		res.writeHead(200, {
			'Content-Type': contentType,
			'Cache-Control': 'public, max-age=0',
		})

		// 将文件流导向响应
		fileStream.pipe(res)
	})

	await new Promise<void>((resolve) => {
		server.listen(port, () => {
			console.log(`Static server for project ${projectId} running at http://localhost:${port}`)
			resolve()
		})
	})

	// 存储服务器实例
	runningServers.set(projectId, { server, port })

	// 设置自动关闭定时器（例如30分钟后）
	setTimeout(
		() => {
			closeStaticServer(projectId)
		},
		30 * 60 * 1000,
	)

	return port
}

export function closeStaticServer(projectId: string): void {
	const serverInfo = runningServers.get(projectId)
	if (serverInfo) {
		serverInfo.server.close()
		runningServers.delete(projectId)
		console.log(`Static server for project ${projectId} closed`)
	}
}
