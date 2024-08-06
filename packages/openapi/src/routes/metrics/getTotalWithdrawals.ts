import { ZodOpenApiOperationObject } from 'zod-openapi';
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses';
import z from '../../../../api/src/schema/zod';
import { Change24HoursResponseSchema, Change7DaysResponseSchema } from '../../apiResponseSchema/metrics/timeChangeResponse';

const TotalWithdrawlsSchema = z.object({
    totalWithdrawls: z
        .number()
        .describe('The total number of withdrawls')
        .openapi({ example: 1000000 }),
    change24h:Change24HoursResponseSchema,
    change7d:Change7DaysResponseSchema
});

export const getTotalWithdrawals: ZodOpenApiOperationObject = {
    operationId: 'getTotalWithdrawals',
    summary: 'Retrieve total number of withdrawls ',
    description: 'Returns the total number of withdrawls',
    tags: ['Metrics'],
    requestParams: {},
    responses: {
        '200': {
            description: 'The total number of withdrawls.',
            content: {
                'application/json': {
                    schema: TotalWithdrawlsSchema,
                },
            },
        },
        ...openApiErrorResponses,
    },
};
