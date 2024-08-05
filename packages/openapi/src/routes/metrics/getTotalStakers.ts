import { ZodOpenApiOperationObject } from 'zod-openapi';
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses';
import z from '../../../../api/src/schema/zod';
import { Change24HoursResponseSchema, Change7DaysResponseSchema } from '../../apiResponseSchema/metrics/timeChangeResponse';

const TotalStakersSchema = z.object({
    totalStakers: z
        .number()
        .describe('The total number of AVS stakers registered')
        .openapi({ example: 1000000 }),
        change24h:Change24HoursResponseSchema,
        change7d:Change7DaysResponseSchema
});

export const getTotalStakerssMetric: ZodOpenApiOperationObject = {
    operationId: 'getTotalStakerssMetric',
    summary: 'Retrieve total number of AVS stakers',
    description: 'Returns the total number of AVS stakers registered.',
    tags: ['Metrics'],
    requestParams: {},
    responses: {
        '200': {
            description: 'The total number of AVS stakers registered.',
            content: {
                'application/json': {
                    schema: TotalStakersSchema,
                },
            },
        },
        ...openApiErrorResponses,
    },
};
