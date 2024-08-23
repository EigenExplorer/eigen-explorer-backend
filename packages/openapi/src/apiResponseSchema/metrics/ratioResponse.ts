import z from '../../../../api/src/schema/zod'
import { Change24HoursResponseSchema, Change7DaysResponseSchema } from './timeChangeResponse'

const createRatioSchema = (description: string) =>
    z.object({
        ratio: z
            .number()
            .describe(description)
            .openapi({ example: 1.0 }),
        change24h: Change24HoursResponseSchema.optional(),
        change7d: Change7DaysResponseSchema.optional(),
    })

export const DeploymentRatioSchema = createRatioSchema('The current value of Deployment Ratio')

export const RestakingRatioSchema = createRatioSchema('The current value of Restaking Ratio')
