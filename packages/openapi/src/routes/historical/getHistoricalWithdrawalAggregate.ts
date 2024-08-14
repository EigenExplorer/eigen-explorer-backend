import { ZodOpenApiOperationObject } from 'zod-openapi';
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses';
import z from '../../../../api/src/schema/zod';
import { HistoricalCountSchema } from '../../../../api/src/schema/zod/schemas/historicalCountQuery';
import { HistoricalAggregateSchema } from '../../apiResponseSchema/metrics/historicalAggregateResponse';

const HistoricalWithdrawalsAggregateResponseSchema = z.object({
    data: z.array(HistoricalAggregateSchema)
});


export const getHistoricalWithdrawalAggregate: ZodOpenApiOperationObject = {
    operationId: 'getHistoricalWithdrawalsAggregate',
    summary: 'Retrieve historical withdrawal aggregate data',
    description: 'Returns historical aggregate data for withdrawals, including the total value of withdrawals in ETH at specified timestamp values.',
    tags: ['Metrics'],
    requestParams: {
        query: HistoricalCountSchema
    },
    responses: {
        '200': {
            description: 'The historical aggregate data for withdrawals, including the total value of withdrawals in ETH at specified timestamp values.',
            content: {
                'application/json': {
                    schema: HistoricalWithdrawalsAggregateResponseSchema,
                },
            },
        },
        ...openApiErrorResponses,
    },
};
