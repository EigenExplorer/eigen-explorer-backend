import { ZodOpenApiOperationObject } from 'zod-openapi';
import z from '../../../../api/src/schema/zod';
import { PaginationQuerySchema } from '../../../../api/src/schema/zod/schemas/paginationQuery';
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses';
import { AllAvsSchema } from '../../apiResponseSchema/avs/avsResponse';
import { PaginationMetaResponsesSchema } from '../../apiResponseSchema/base/paginationMetaResponses';

const AvsResponseSchema = z.object({
    data: z.array(AllAvsSchema),
    meta: z.array(PaginationMetaResponsesSchema),
});

export const getAllAvs: ZodOpenApiOperationObject = {
    operationId: 'getAllAvs',
    summary: 'Retrieve all AVS',
    description: 'Returns all AVS records. This endpoint supports pagination.',
    tags: ['AVS'],
    requestParams: {
        query: PaginationQuerySchema,
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