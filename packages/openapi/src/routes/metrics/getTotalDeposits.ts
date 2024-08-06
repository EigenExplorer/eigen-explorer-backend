import { ZodOpenApiOperationObject } from 'zod-openapi';
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses';
import z from '../../../../api/src/schema/zod';
import { Change24HoursResponseSchema, Change7DaysResponseSchema } from '../../apiResponseSchema/metrics/timeChangeResponse';

const TotalDepositsSchema = z.object({
    totalDeposits: z
        .number()
        .describe('The total number of deposits')
        .openapi({ example: 1000000 }),
    change24h:Change24HoursResponseSchema,
    change7d:Change7DaysResponseSchema
});

export const getTotalDeposits: ZodOpenApiOperationObject = {
    operationId: 'getTotalDeposits',
    summary: 'Retrieve total number of deposits ',
    description: 'Returns the total number of deposits',
    tags: ['Metrics'],
    requestParams: {},
    responses: {
        '200': {
            description: 'The total number of deposits.',
            content: {
                'application/json': {
                    schema: TotalDepositsSchema,
                },
            },
        },
        ...openApiErrorResponses,
    },
};
