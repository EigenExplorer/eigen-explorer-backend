import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses';
import z from '../../../../api/src/schema/zod';
import { EthereumAddressSchema } from '../../../../api/src/schema/zod/schemas/base/ethereumAddress';
import { ZodOpenApiOperationObject } from 'zod-openapi';
import { PaginationQuerySchema } from '../../../../api/src/schema/zod/schemas/paginationQuery';
import { OperatorResponseSchema } from '../../apiResponseSchema/operatorResponse';
import { PaginationMetaResponsesSchema } from '../../apiResponseSchema/base/paginationMetaResponses';

const EthereumAddressParam = z.object({
    address: EthereumAddressSchema,
});

const AvsOperatorResponseSchema = z.object({
    data: z.array(OperatorResponseSchema),
    meta: PaginationMetaResponsesSchema,
});

export const getAvsOperatorsByAddress: ZodOpenApiOperationObject = {
    operationId: 'getAvsOperatorsByAddress',
    summary: 'Retrieve all operators for a given AVS address',
    description:
        'Returns all operators for a given AVS address. This endpoint supports pagination.',
    tags: ['AVS'],
    requestParams: {
        path: EthereumAddressParam,
        query: PaginationQuerySchema,
    },
    responses: {
        '200': {
            description: 'The operators record found for the AVS.',
            content: {
                'application/json': {
                    schema: AvsOperatorResponseSchema,
                },
            },
        },
        ...openApiErrorResponses,
    },
};
