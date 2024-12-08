export default defineEventHandler(async (e) => {
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
