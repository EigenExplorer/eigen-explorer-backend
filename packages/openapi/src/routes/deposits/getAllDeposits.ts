import { ZodOpenApiOperationObject } from 'zod-openapi';
import z from '../../../../api/src/schema/zod';
import { PaginationQuerySchema } from '../../../../api/src/schema/zod/schemas/paginationQuery';
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses';
import { DepositsResponseSchema } from '../../apiResponseSchema/deposits/depositsResponseSchema';
import { PaginationMetaResponsesSchema } from '../../apiResponseSchema/base/paginationMetaResponses';
import { DepositListQuerySchema } from '../../../../api/src/schema/zod/schemas/deposit';

const CombinedDepositsResponseSchema = z.object({
    data: z.array(DepositsResponseSchema),
    meta: PaginationMetaResponsesSchema,
});

const CombinedQuerySchema = z
    .object({})
    .merge(PaginationQuerySchema)
    .merge(DepositListQuerySchema);

export const getAllDeposits: ZodOpenApiOperationObject = {
    operationId: 'getAllDeposits',
    summary: 'Retrieve all deposits',
    description: 'Returns all deposit data, including the transaction hash, token address, and other relevant information.',
    tags: ['Deposits'],
    requestParams: {
        query: CombinedQuerySchema,
    },
    responses: {
        '200': {
            description: 'The list of deposits.',
            content: {
                'application/json': {
                    schema: CombinedDepositsResponseSchema,
                },
            },
        },
        ...openApiErrorResponses,
    },
};
