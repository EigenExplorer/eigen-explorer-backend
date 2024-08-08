import { ZodOpenApiOperationObject } from 'zod-openapi';
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses';
import z from '../../../../api/src/schema/zod';
import { HistoricalCountSchema } from '../../../../api/src/schema/zod/schemas/historicalCountQuery';
import { WithdrawalHistoricCountSchema } from '../../apiResponseSchema/withdrawals/withdrawalHistoricCountSchema';

const HistoricalWithdrawalCountResponseSchema = z.object({
    data: z.array(WithdrawalHistoricCountSchema)
});

export const getHistoricalWithdrawalCount: ZodOpenApiOperationObject = {
    operationId: 'getHistoricalWithdrawalCount',
    summary: 'Retrieve historical count of AVS withdrawals',
    description: 'Returns the total number of AVS withdrawals made at timestamp values',
    tags: ['Metrics'],
    requestParams: {
        query: HistoricalCountSchema,
    },
    responses: {
        '200': {
            description: 'The total number of AVS withdrawals made at timestamp values',
            content: {
                'application/json': {
                    schema: HistoricalWithdrawalCountResponseSchema,
                },
            },
        },
        ...openApiErrorResponses,
    },
};