import { ZodOpenApiOperationObject } from 'zod-openapi';
import z from '../../../../api/src/schema/zod';
import { PaginationQuerySchema } from '../../../../api/src/schema/zod/schemas/paginationQuery';
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses';
import { PaginationMetaResponsesSchema } from '../../apiResponseSchema/base/paginationMetaResponses';
import { OperatorResponseSchema } from '../../apiResponseSchema/operatorResponse';

const AllOperatorsResponseSchema = z.object({
    data: z.array(OperatorResponseSchema),
    meta: PaginationMetaResponsesSchema,
});

export const getAllOperators: ZodOpenApiOperationObject = {
    operationId: 'getAllOperators',
    summary: 'Retrieve all operators',
    description:
        'Returns all operator records. This endpoint supports pagination.',
    tags: ['Operators'],
    requestParams: {
        query: PaginationQuerySchema,
    },
    responses: {
        '200': {
            description: 'The list of Operators records.',
            content: {
                'application/json': {
                    schema: AllOperatorsResponseSchema,
                },
            },
        },
        ...openApiErrorResponses,
    },
};
