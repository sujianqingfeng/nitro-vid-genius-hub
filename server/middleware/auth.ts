export default defineEventHandler(async (e) => {
	const { pathname } = getRequestURL(e)
	if (pathname.startsWith('/_remotion')) {
		return
	}

	const authorization = getHeader(e, 'Authorization')
	if (!authorization) {
		throw createError('No authorization')
	}

	if (authorization !== process.env.API_KEY) {
		return createError({
			message: 'Unauthorized',
			status: 401,
		})
	}
})
