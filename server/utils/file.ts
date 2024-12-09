import { access, readFile } from 'node:fs/promises'
export async function fileExists(path: string): Promise<boolean> {
	try {
		await access(path)
		return true
	} catch {
		return false
	}
}

export async function readFileJson<T>(path: string): Promise<T> {
	const json = await readFile(path, 'utf-8')
	return JSON.parse(json) as T
}
