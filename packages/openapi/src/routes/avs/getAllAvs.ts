import { ZodOpenApiOperationObject } from 'zod-openapi';
import z from '../../../../api/src/schema/zod';
import { PaginationQuerySchema } from '../../../../api/src/schema/zod/schemas/paginationQuery';
import { AvsSchema } from '../../../../api/src/schema/zod/schemas/avs';
import { openApiErrorResponses } from '../../apiResTypes/errorResponses';

const AvsResponseSchema = z.object({
    AvsSchema,
    meta: z.object({
        total: z
            .number()
            .describe('Total number of AVS records in the database')
            .openapi({ example: 30 }),
        skip: z
            .number()
            .describe('The number of skiped records for this query')
            .openapi({ example: 0 }),
        take: z
            .number()
            .describe('The number of records returned for this query')
            .openapi({ example: 12 }),
    }),
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
                    schema: z.array(AvsResponseSchema),
                },
            },
        },
        ...openApiErrorResponses,
    },
};
