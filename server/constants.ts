import { join } from 'node:path'

export const UPLOAD_DIR = join(process.cwd(), 'uploads')
export const OUTPUT_FILE = 'output.mp4'

export const EXTRACT_DIR = 'dist'
export const RENDER_INFO_FILE = 'render-info.json'
export const PROGRESS_FILE = 'progress.json'

export const BUNDLE_DIR = 'bundle'

export const RENDER_QUEUE_NAME = 'render-tasks'

export const REDIS_URL = process.env.REDIS_URL
