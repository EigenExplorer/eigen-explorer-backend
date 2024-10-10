import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses';
import z from '../../../../api/src/schema/zod';
import { ZodOpenApiOperationObject } from 'zod-openapi';
import { PaginationQuerySchema } from '../../../../api/src/schema/zod/schemas/paginationQuery';
import { AvsAddressSchema } from '../../apiResponseSchema/avs/avsAddressResponse';
import { PaginationMetaResponsesSchema } from '../../apiResponseSchema/base/paginationMetaResponses';
import { SearchByText, SearchMode } from '../../../../api/src/schema/zod/schemas/separateSearchQueries';

const AvsAddressResponseSchema = z.object({
    data: z.array(AvsAddressSchema),
    meta: PaginationMetaResponsesSchema,
});

const CombinedQuerySchema = z
    .object({})
    .merge(SearchMode)
    .merge(SearchByText)
    .merge(PaginationQuerySchema)

export const getAllAvsAddresses: ZodOpenApiOperationObject = {
    operationId: 'getAllAvsAddresses',
    summary: 'Retrieve all AVS addresses',
    description:
        'Returns a list of all AVS addresses. This page supports pagination.',
    tags: ['AVS'],
    requestParams: {
        query: CombinedQuerySchema,
    },
    responses: {
        '200': {
            description: 'The list of AVS addresses.',
            content: {
                'application/json': {
                    schema: AvsAddressResponseSchema,
                },
            },
        },
        ...openApiErrorResponses,
    },
};
