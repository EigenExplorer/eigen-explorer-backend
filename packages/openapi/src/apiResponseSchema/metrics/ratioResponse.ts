import z from '../../../../api/src/schema/zod';
import { Change24HoursResponseSchema, Change7DaysResponseSchema } from './timeChangeResponse';

export const DeploymentRatioSchema = z.object({
    deploymentRatio: z
        .number()
        .describe('The current value of Deployment Ratio')
        .openapi({ example: 1.0 }),
    change24h:Change24HoursResponseSchema,
    change7d:Change7DaysResponseSchema
});

export const RestakingRatioSchema = z.object({
    restakingRatio: z
        .number()
        .describe('The current value of Restaking Ratio')
        .openapi({ example: 1.0 }),
    change24h:Change24HoursResponseSchema,
    change7d:Change7DaysResponseSchema
});