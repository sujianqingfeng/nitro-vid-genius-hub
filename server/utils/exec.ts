import { exec } from 'node:child_process'

interface ExecOptions {
	onProgress?: (data: string) => void
}

export function execCommand(command: string, options: ExecOptions = {}) {
	return new Promise((resolve, reject) => {
		const child = exec(command)

		child.stdout?.on('data', (data) => {
			options.onProgress?.(data.toString())
		})

		child.stderr?.on('data', (data) => {
			console.error(`stderr: ${data}`)
		})

		child.on('close', (code) => {
			if (code === 0) {
				resolve(code)
			} else {
				reject(new Error(`Command failed with code ${code}`))
			}
		})
	})
}
