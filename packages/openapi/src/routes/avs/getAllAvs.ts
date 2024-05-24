import { ZodOpenApiOperationObject } from 'zod-openapi';
import z from '../../../../api/src/schema/zod';
import { PaginationQuerySchema } from '../../../../api/src/schema/zod/schemas/paginationQuery';
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses';
import { AvsSchema } from '../../apiResponseSchema/avs/avsResponse';
import { PaginationMetaResponsesSchema } from '../../apiResponseSchema/base/paginationMetaResponses';
import { WithTvlQuerySchema } from '../../../../api/src/schema/zod/schemas/withTvlQuery';

const AvsResponseSchema = z.object({
    data: z.array(AvsSchema),
    meta: PaginationMetaResponsesSchema,
});

const CombinedQuerySchema = z
    .object({})
    .merge(WithTvlQuerySchema)
    .merge(PaginationQuerySchema);

export const getAllAvs: ZodOpenApiOperationObject = {
    operationId: 'getAllAvs',
    summary: 'Retrieve all AVS',
    description: 'Returns all AVS records. This endpoint supports pagination.',
    tags: ['AVS'],
    requestParams: {
        query: CombinedQuerySchema,
    },
    responses: {
        '200': {
            description: 'The list of AVS records.',
            content: {
                'application/json': {
                    schema: AvsResponseSchema,
                },
            },
        },
        ...openApiErrorResponses,
    },
};
