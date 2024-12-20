import child_process from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { type RenderMediaOnProgress, renderMedia, selectComposition } from '@remotion/renderer'
import { type Job, Worker } from 'bullmq'
import extract from 'extract-zip'
import { BUNDLE_DIR, EXTRACT_DIR, OUTPUT_FILE, PROGRESS_FILE, REDIS_URL, RENDER_INFO_FILE, RENDER_QUEUE_NAME, UPLOAD_DIR } from '~/constants'
import { execCommand } from '~/utils/exec'
import { readFileJson } from '~/utils/file'

function createWriteRenderOnProgress(onProgress: (p: number) => void): RenderMediaOnProgress {
	return async ({ progress }) => {
		const p = +(progress * 100).toFixed(2)
		onProgress(p)
	}
}

async function remotionRender({
	id,
	compositionId,
	inputProps,
	outputLocation,
	serveUrl,
	compositionInfo,
	onProgress,
}: {
	id: string
	compositionId: string
	inputProps: Record<string, any>
	outputLocation: string
	serveUrl: string
	compositionInfo: Record<string, any>
	onProgress: (p: number) => void
}) {
	const composition = await selectComposition({
		serveUrl,
		id: compositionId,
		inputProps,
	})

	composition.durationInFrames = compositionInfo.durationInFrames
	composition.fps = compositionInfo.fps
	composition.height = compositionInfo.height
	composition.width = compositionInfo.width

	const throttleProgress = throttle(
		createWriteRenderOnProgress(async (p) => {
			onProgress(p)
			const message = `${compositionId}-${id}-${p}%`
			const targetDir = join(UPLOAD_DIR, id)
			const progressFilePath = join(targetDir, PROGRESS_FILE)
			await writeFile(progressFilePath, JSON.stringify({ progress: message }))
			console.log(message)
		}),
		2000,
		{
			trailing: true,
		},
	)

	await renderMedia({
		composition,
		serveUrl,
		codec: 'h264',
		outputLocation,
		inputProps,
		onProgress: throttleProgress,
	})
}

async function extractZipFile(id: string, fileName: string) {
	const targetDir = join(UPLOAD_DIR, id)
	const filePath = join(targetDir, fileName)
	const extractDir = join(targetDir, EXTRACT_DIR)
	await extract(filePath, { dir: extractDir })

	return {
		extractDir,
		targetDir,
	}
}

async function cutPlayVideo({
	id,
	compositionId,
	playVideoFileName,
	comments,
	bundleDir,
	compositionInfo,
}: { id: string; compositionId: string; playVideoFileName: string; comments: any[]; bundleDir: string; compositionInfo: Record<string, any> }) {
	const publicDir = join(bundleDir, 'public')
	const playVideoFilePath = join(publicDir, playVideoFileName)
	const destPlayVideoName = `${compositionId}-${id}-play-video.mp4`
	const destPlayVideoPath = join(publicDir, destPlayVideoName)

	const { fps } = compositionInfo
	const lastComment = comments[comments.length - 1]
	const commentsEndFrame = lastComment ? lastComment.form + lastComment.durationInFrames : 0

	const end = commentsEndFrame / fps
	const command = `ffmpeg -y -ss 0 -i ${playVideoFilePath} -t ${end} -threads 3 -preset medium -crf 40 -vf "scale=trunc(oh*a/2)*2:720"  ${destPlayVideoPath} -progress pipe:1`
	await execCommand(command)

	return destPlayVideoName
}

async function renderComments(job: Job) {
	const { id, fileName } = job.data
	const { extractDir, targetDir } = await extractZipFile(id, fileName)
	const outputLocation = join(targetDir, OUTPUT_FILE)
	const bundleDir = join(extractDir, BUNDLE_DIR)

	const { compositionId, inputProps, composition: compositionInfo } = await readFileJson<Record<string, any>>(join(extractDir, RENDER_INFO_FILE))
	const { videoSrc, comments } = inputProps

	const destPlayVideoName = await cutPlayVideo({ id, compositionId, playVideoFileName: videoSrc, comments, bundleDir, compositionInfo })
	const newInputProps = { ...inputProps, videoSrc: destPlayVideoName }

	await remotionRender({
		id,
		compositionId,
		inputProps: newInputProps,
		outputLocation,
		serveUrl: bundleDir,
		compositionInfo,
		onProgress(p) {
			job.updateProgress(p)
		},
	})
}

async function newRenderComments(job: Job) {
	const { id, fileName } = job.data
	const { extractDir, targetDir } = await extractZipFile(id, fileName)
	const outputLocation = join(targetDir, OUTPUT_FILE)
	const bundleDir = join(extractDir, BUNDLE_DIR)

	const { compositionId, inputProps, composition: compositionInfo } = await readFileJson<Record<string, any>>(join(extractDir, RENDER_INFO_FILE))
	const { playFile, comments } = inputProps

	const destPlayVideoName = await cutPlayVideo({ id, compositionId, playVideoFileName: playFile, comments, bundleDir, compositionInfo })
	const newInputProps = { ...inputProps, playFile: destPlayVideoName }

	await remotionRender({
		id,
		compositionId,
		inputProps: newInputProps,
		outputLocation,
		serveUrl: bundleDir,
		compositionInfo,
		onProgress(p) {
			job.updateProgress(p)
		},
	})
}

async function renderShortTexts(job: Job) {
	const { id, fileName } = job.data
	const { extractDir, targetDir } = await extractZipFile(id, fileName)
	const outputLocation = join(targetDir, OUTPUT_FILE)
	const bundleDir = join(extractDir, BUNDLE_DIR)

	const { compositionId, inputProps, composition: compositionInfo } = await readFileJson<Record<string, any>>(join(extractDir, RENDER_INFO_FILE))
	await remotionRender({
		id,
		compositionId,
		inputProps,
		outputLocation,
		serveUrl: bundleDir,
		compositionInfo,
		onProgress(p) {
			job.updateProgress(p)
		},
	})
}

async function renderSyntheticSubtitle(job: Job) {
	const { id, fileName } = job.data

	const targetDir = join(UPLOAD_DIR, id)
	const filePath = join(targetDir, fileName)
	const extractDir = join(targetDir, EXTRACT_DIR)
	await extract(filePath, { dir: extractDir })

	const renderInfoPath = join(extractDir, RENDER_INFO_FILE)

	const { cmd } = await readFileJson<Record<string, any>>(renderInfoPath)
	const outputPath = join(targetDir, OUTPUT_FILE)

	await new Promise((resolve, reject) => {
		const ffmpeg = child_process.spawn('ffmpeg', cmd.concat(outputPath), { cwd: extractDir })

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
				console.error('FFmpeg stderr:', stderr)
				reject(new Error(`FFmpeg process exited with code ${code}\n${stderr}`))
			}
		})
	})
	job.updateProgress(100)
}

export default defineNitroPlugin(() => {
	new Worker(
		RENDER_QUEUE_NAME,
		async (job) => {
			switch (job.name) {
				case 'render-comments':
					try {
						await renderComments(job)
					} catch (error) {
						console.log('🚀 ~ error:', error)
					}
					break

				case 'new-render-comments':
					try {
						await newRenderComments(job)
					} catch (error) {
						console.log('🚀 ~ error:', error)
					}
					break

				case 'render-short-texts':
					try {
						await renderShortTexts(job)
					} catch (error) {
						console.log('🚀 ~ error:', error)
					}
					break

				case 'synthetic-subtitle':
					try {
						await renderSyntheticSubtitle(job)
					} catch (error) {
						console.log('🚀 ~ error:', error)
					}
					break

				default:
					break
			}
		},
		{
			connection: {
				url: REDIS_URL,
			},
			concurrency: 1,
		},
	)
})
