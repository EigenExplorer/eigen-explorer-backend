import { ZodOpenApiOperationObject } from 'zod-openapi';
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses';
import z from '../../../../api/src/schema/zod';
import { HistoricalCountSchema } from '../../../../api/src/schema/zod/schemas/historicalCountQuery';
import { DepositHistoricalCountSchema } from '../../apiResponseSchema/metrics/historicalCountResponse';

const HistoricalDepositCountResponseSchema = z.object({
    data: z.array(DepositHistoricalCountSchema)
});

export const getHistoricalDepositCount: ZodOpenApiOperationObject = {
    operationId: 'getHistoricalDepositCount',
    summary: 'Retrieve historical count of AVS deposits',
    description: 'Returns the total number of AVS deposits made at timestamp values',
    tags: ['Metrics'],
    requestParams: {
        query: HistoricalCountSchema,
    },
    responses: {
        '200': {
            description: 'The total number of AVS deposits made at timestamp values',
            content: {
                'application/json': {
                    schema: HistoricalDepositCountResponseSchema,
                },
            },
        },
        ...openApiErrorResponses,
    },
};