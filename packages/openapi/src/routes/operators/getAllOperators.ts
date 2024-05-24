import { ZodOpenApiOperationObject } from 'zod-openapi';
import z from '../../../../api/src/schema/zod';
import { PaginationQuerySchema } from '../../../../api/src/schema/zod/schemas/paginationQuery';
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses';
import { PaginationMetaResponsesSchema } from '../../apiResponseSchema/base/paginationMetaResponses';
import { OperatorResponseSchema } from '../../apiResponseSchema/operatorResponse';
import { WithTvlQuerySchema } from '../../../../api/src/schema/zod/schemas/withTvlQuery';

const AllOperatorsResponseSchema = z.object({
    data: z.array(OperatorResponseSchema),
    meta: PaginationMetaResponsesSchema,
});

const CombinedQuerySchema = z
    .object({})
    .merge(WithTvlQuerySchema)
    .merge(PaginationQuerySchema);

export const getAllOperators: ZodOpenApiOperationObject = {
    operationId: 'getAllOperators',
    summary: 'Retrieve all operators',
    description:
        'Returns all operator records. This endpoint supports pagination.',
    tags: ['Operators'],
    requestParams: {
        query: CombinedQuerySchema,
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
