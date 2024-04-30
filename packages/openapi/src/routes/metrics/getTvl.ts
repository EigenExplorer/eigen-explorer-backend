import { ZodOpenApiOperationObject } from 'zod-openapi';
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses';
import { TvlResponseSchema } from '../../apiResponseSchema/metrics/tvlResponse';

export const getTvlMetrics: ZodOpenApiOperationObject = {
    operationId: 'getTvlMetrics',
    summary: 'Retrieve total TVL',
    description:
        'Returns the total value locked (TVL) in all restaking strategies and beacon chain restaking.',
    tags: ['Metrics'],
    requestParams: {},
    responses: {
        '200': {
            description: 'The value of the combined TVL.',
            content: {
                'application/json': {
                    schema: TvlResponseSchema.describe(
                        'The value of the combined TVL.'
                    ),
                },
            },
        },
        ...openApiErrorResponses,
    },
};
