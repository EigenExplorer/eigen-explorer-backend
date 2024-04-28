import { openApiErrorResponses } from '../../components/errorResponses';
import z from '../../../../api/src/schema/zod';
import { AvsAddressSchema } from '../../../../api/src/schema/zod/schemas/avs';
import { ZodOpenApiOperationObject } from 'zod-openapi';
import { PaginationQuerySchema } from '../../../../api/src/schema/zod/schemas/paginationQuery';

export const getAllAvsAddresses: ZodOpenApiOperationObject = {
    operationId: 'getAllAvsAddresses',
    summary: 'Retrieve all AVS addresses',
    description: 'Returns a list of all AVS addresses.',
    tags: ['AVS'],
    requestParams: {
        query: PaginationQuerySchema,
    },
    responses: {
        '200': {
            description: 'The created links',
            content: {
                'application/json': {
                    schema: z.array(AvsAddressSchema),
                },
            },
        },
        ...openApiErrorResponses,
    },
};
