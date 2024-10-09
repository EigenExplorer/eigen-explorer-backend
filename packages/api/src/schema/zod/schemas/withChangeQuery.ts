import z from '..'

const createWithChangeQuerySchema = (description: string) =>
	z.object({
		withChange: z
			.enum(['true', 'false'])
			.default('false')
			.describe(description)
			.transform((val) => val === 'true')
			.openapi({ example: 'false' }),
	})

export const WithChangeQuerySchema = createWithChangeQuerySchema(
	'Toggle whether the route should return 24h/7d change for TVL'
)

export const CountOfAvsWithChangeQuerySchema = createWithChangeQuerySchema(
	'Toggle whether the route should return 24h/7d change for count of AVS'
)

export const CountOfOperatorsWithChangeQuerySchema = createWithChangeQuerySchema(
	'Toggle whether the route should return 24h/7d change for count of AVS operators'
)

export const CountOfStakersWithChangeQuerySchema = createWithChangeQuerySchema(
	'Toggle whether the route should return 24h/7d change for count of AVS stakers'
)

export const CountOfWithdrawalsWithChangeQuerySchema = createWithChangeQuerySchema(
	'Toggle whether the route should return 24h/7d change for count of withdrawals'
)

export const CountOfDepositsWithChangeQuerySchema = createWithChangeQuerySchema(
	'Toggle whether the route should return 24h/7d change for count of deposits'
)

export const RatioWithChangeQuerySchema = createWithChangeQuerySchema(
	'Toggle whether the route should return 24h/7d change for ratio value'
)
