import z from '../../../../api/src/schema/zod';
import { ZodOpenApiOperationObject } from 'zod-openapi';
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses';
import { PaginationMetaResponsesSchema } from '../../apiResponseSchema/base/paginationMetaResponses';
import { PaginationQuerySchema } from '../../../../api/src/schema/zod/schemas/paginationQuery';
import { EthereumAddressSchema } from '../../../../api/src/schema/zod/schemas/base/ethereumAddress';
import { WithdrawalsResponseWithUpdateFields } from '../../apiResponseSchema/withdrawals/withdrawalsResponseSchema';

const WithdrawalsResponseSchemaWithMeta = z.object({
    data: z.array(WithdrawalsResponseWithUpdateFields),
    meta: PaginationMetaResponsesSchema,
});

const StakerAddressParam = z.object({
    address: EthereumAddressSchema.describe(
        'The address of the staker'
    ).openapi({ example: '0x00000002d88f9b3f4eb303564817fff4adcde46f' }),
});

export const getCompletedStakerWithdrawals: ZodOpenApiOperationObject = {
    operationId: 'getCompletedStakerWithdrawals',
    summary: 'Retrieve completed withdrawals by staker address',
    description:
        'Returns all completed withdrawal data of the requested staker.',
    tags: ['Stakers'],
    requestParams: {
        path: StakerAddressParam,
        query: PaginationQuerySchema,
    },
    responses: {
        '200': {
            description: 'The list of completed withdrawals.',
            content: {
                'application/json': {
                    schema: WithdrawalsResponseSchemaWithMeta,
                },
            },
        },
        ...openApiErrorResponses,
    },
};
