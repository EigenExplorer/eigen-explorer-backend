import z from '../../../../api/src/schema/zod';
import { ZodOpenApiOperationObject } from 'zod-openapi';
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses';
import { PaginationQuerySchema } from '../../../../api/src/schema/zod/schemas/paginationQuery';
import { PaginationMetaResponsesSchema } from '../../apiResponseSchema/base/paginationMetaResponses';
import { WithdrawalsResponseSchema } from '../../apiResponseSchema/withdrawals/withdrawalsResponseSchema';
import { EthereumAddressSchema } from '../../../../api/src/schema/zod/schemas/base/ethereumAddress';

const WithdrawalsResponseSchemaWithMeta = z.object({
    data: z.array(WithdrawalsResponseSchema),
    meta: PaginationMetaResponsesSchema,
});

const StakerAddressParam = z.object({
    address: EthereumAddressSchema.describe(
        'The address of the staker'
    ).openapi({ example: '0x00000002d88f9b3f4eb303564817fff4adcde46f' }),
});

export const getQueuedWithdrawableStakerWithdrawals: ZodOpenApiOperationObject =
    {
        operationId: 'getQueuedWithdrawableStakerWithdrawals',
        summary:
            'Retrieve queued and withdrawable withdrawals by staker address',
        description:
            'Returns all queued and withdrawable withdrawal data of the requested staker.',
        tags: ['Stakers'],
        requestParams: {
            path: StakerAddressParam,
            query: PaginationQuerySchema,
        },
        responses: {
            '200': {
                description: 'The list of queued and withdrawable withdrawals.',
                content: {
                    'application/json': {
                        schema: WithdrawalsResponseSchemaWithMeta,
                    },
                },
            },
            ...openApiErrorResponses,
        },
    };
