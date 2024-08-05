import { ZodOpenApiOperationObject } from 'zod-openapi';
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses';
import z from '../../../../api/src/schema/zod';
import { Change24HoursResponseSchema, Change7DaysResponseSchema } from '../../apiResponseSchema/metrics/timeChangeResponse';

const TotalAvsSchema = z.object({
    totalAvs: z
        .number()
        .describe('The total number of AVS registered')
        .openapi({ example: 1000000 }),
    change24h:Change24HoursResponseSchema,
    change7d:Change7DaysResponseSchema
});

export const getTotalAvsMetric: ZodOpenApiOperationObject = {
    operationId: 'getTotalAvsMetric',
    summary: 'Retrieve total number of AVS',
    description: 'Returns the total number of AVS registered.',
    tags: ['Metrics'],
    requestParams: {},
    responses: {
        '200': {
            description: 'The total number of AVS registered.',
            content: {
                'application/json': {
                    schema: TotalAvsSchema,
                },
            },
        },
        ...openApiErrorResponses,
    },
};
