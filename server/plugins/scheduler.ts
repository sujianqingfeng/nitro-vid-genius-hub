import { promises as fs } from 'node:fs'
import path from 'node:path'
import cron from 'node-cron'
import { UPLOAD_DIR } from '~/constants'

export default defineNitroPlugin(() => {
	// 每天凌晨 2 点执行清理任务
	cron.schedule('0 2 * * *', async () => {
		try {
			await cleanupOldFiles()
		} catch (error) {
			console.error('Cleanup task failed:', error)
		}
	})
})

async function cleanupOldFiles() {
	const thresholdDate = new Date()
	thresholdDate.setDate(thresholdDate.getDate() - 3) // 3天前的日期

	try {
		// 确保目录存在
		await fs.access(UPLOAD_DIR)

		// 读取目录内容
		const items = await fs.readdir(UPLOAD_DIR, { withFileTypes: true })

		for (const item of items) {
			const itemPath = path.join(UPLOAD_DIR, item.name)
			const stats = await fs.stat(itemPath)

			// 如果文件/目录的修改时间早于3天前
			if (stats.mtime < thresholdDate) {
				if (item.isDirectory()) {
					// 如果是目录，递归删除
					await fs.rm(itemPath, { recursive: true, force: true })
					console.log(`Deleted old directory: ${itemPath}`)
				} else {
					// 如果是文件，直接删除
					await fs.unlink(itemPath)
					console.log(`Deleted old file: ${itemPath}`)
				}
			}
		}

		console.log('Cleanup completed successfully')
	} catch (error) {
		if (error.code === 'ENOENT') {
			console.log('Uploads directory does not exist')
		} else {
			throw error
		}
	}
}
