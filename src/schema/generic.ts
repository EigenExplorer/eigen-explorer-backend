import Joi from 'joi'

export const PaginationQuerySchema = Joi.object<{ skip: number; take: number }>(
	{
		skip: Joi.number().default(0).min(0),
		take: Joi.number().default(12).min(1)
	}
)
