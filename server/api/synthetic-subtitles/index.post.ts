import child_process from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import extract from 'extract-zip'
import { z } from 'zod'
import { EXTRACT_DIR, OUTPUT_FILE, RENDER_INFO_FILE, UPLOAD_DIR } from '~/constants'

const BodySchema = z.object({
	id: z.string(),
	fileName: z.string(),
})

export default defineEventHandler(async (event) => {
	const { id, fileName } = await readValidatedBody(event, BodySchema.parse)

	const targetDir = join(UPLOAD_DIR, id)
	const filePath = join(targetDir, fileName)
	const extractDir = join(targetDir, EXTRACT_DIR)
	await extract(filePath, { dir: extractDir })

	const renderInfoPath = join(extractDir, RENDER_INFO_FILE)
	const renderInfo = JSON.parse(await readFile(renderInfoPath, 'utf-8'))

	const { sourceFileName, subtitlesFileName } = renderInfo

	const outputPath = join(targetDir, OUTPUT_FILE)

	await new Promise((resolve, reject) => {
		const ffmpeg = child_process.spawn(
			'ffmpeg',
			[
				'-y',
				'-threads',
				'2',
				'-i',
				sourceFileName,
				'-vf',
				`subtitles='${subtitlesFileName}':force_style='FontName=Microsoft YaHei,FontSize=14,Alignment=2,BorderStyle=1,Outline=0.5,Shadow=0,MarginV=20,PrimaryColour=&HFFFFFF,OutlineColour=&H808080'`,
				'-c:v',
				'libx264',
				'-preset',
				'fast',
				'-crf',
				'16',
				'-maxrate',
				'8M',
				'-bufsize',
				'8M',
				'-c:a',
				'aac',
				'-b:a',
				'320k',
				'-movflags',
				'+faststart',
				outputPath,
			],
			{ cwd: extractDir },
		)

		// 收集错误输出
		let stderr = ''
		ffmpeg.stderr.on('data', (data) => {
			stderr += data.toString()
			console.log('FFmpeg progress:', data.toString())
		})

		ffmpeg.on('error', (error) => {
			console.error('FFmpeg error:', error)
			reject(new Error(`FFmpeg process error: ${error.message}`))
		})

		ffmpeg.on('close', (code) => {
			if (code === 0) {
				console.log('FFmpeg finished successfully')
				resolve(null)
			} else {
				console.error('FFmpeg failed with code:', code)
				console.error('FFmpeg stderr:', stderr)
				reject(new Error(`FFmpeg process exited with code ${code}\n${stderr}`))
			}
		})
	})

	return {
		success: true,
		message: 'synthetic subtitles success',
	}
})
