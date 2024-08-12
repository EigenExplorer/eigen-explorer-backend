import z from '../../../../api/src/schema/zod';
import { ZodOpenApiOperationObject } from 'zod-openapi';
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses';
import { WithdrawalsResponseWithIsCompletedAndUpdateFields } from '../../apiResponseSchema/withdrawals/withdrawalsResponseSchema';

const WithdrawalRootParam = z.object({
    withdrawalRoot: z
        .string()
        .describe('The root hash of the withdrawal')
        .openapi({
            example:
                '0x9e6728ef0a8ad6009107a886047aae35bc5ed7deaa68580b0d1f8f67e3e5ed31',
        }),
});

export const getWithdrawalByWithdrawalRoot: ZodOpenApiOperationObject = {
    operationId: 'getWithdrawalByWithdrawalRoot',
    summary: 'Retrieve withdrawal by withdrawal root',
    description: 'Returns the withdrawal data by withdrawal root.',
    tags: ['Withdrawals'],
    requestParams: {
        path: WithdrawalRootParam,
    },
    responses: {
        '200': {
            description: 'The requested withdrawal record.',
            content: {
                'application/json': {
                    schema: WithdrawalsResponseWithIsCompletedAndUpdateFields,
                },
            },
        },
        ...openApiErrorResponses,
    },
};
