export default defineEventHandler(async (e) => {
	const authorization = getHeader(e, 'Authorization')
	if (!authorization) {
		throw createError('No authorization')
	}
	const token = authorization.split(' ')[1]
	if (!token) {
		throw createError('No authorization')
	}

	if (token !== process.env.AUTH_TOKEN) {
		return createError({
			message: 'Unauthorized',
			status: 401,
		})
	}
})
