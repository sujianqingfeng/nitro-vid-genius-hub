import { join } from 'node:path'

export const UPLOAD_DIR = join(process.cwd(), 'uploads')
export const OUTPUT_FILE = 'output.mp4'

export const EXTRACT_DIR = 'dist'
export const RENDER_INFO_FILE = 'render-info.json'
export const PROGRESS_FILE = 'progress.json'
