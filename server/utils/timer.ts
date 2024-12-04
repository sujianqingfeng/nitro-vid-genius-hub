interface ThrottleOptions {
	leading?: boolean // 是否在节流开始时立即执行
	trailing?: boolean // 是否在节流结束后执行最后一次调用
}

export function throttle<T extends (...args: any[]) => any>(
	func: T,
	wait: number,
	options: ThrottleOptions = {},
): (...args: Parameters<T>) => void {
	let timeout: NodeJS.Timeout | null = null
	let previous = 0
	let lastArgs: Parameters<T> | null = null

	// 设置默认选项
	const { leading = true, trailing = true } = options

	return function (this: any, ...args: Parameters<T>) {
		const now = Date.now()

		// 如果是第一次调用且不需要立即执行
		if (!previous && leading === false) {
			previous = now
		}

		const remaining = wait - (now - previous)

		// 存储最新的参数
		lastArgs = args

		if (remaining <= 0 || remaining > wait) {
			if (timeout) {
				clearTimeout(timeout)
				timeout = null
			}
			previous = now
			func.apply(this, args)
			lastArgs = null
		} else if (!timeout && trailing) {
			// 设置定时器，在结束后执行最后一次调用
			timeout = setTimeout(() => {
				previous = leading ? Date.now() : 0
				timeout = null
				if (lastArgs) {
					func.apply(this, lastArgs)
				}
				lastArgs = null
			}, remaining)
		}
	}
}
