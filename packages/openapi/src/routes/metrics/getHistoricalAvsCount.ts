import { ZodOpenApiOperationObject } from 'zod-openapi';
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses';
import z from '../../../../api/src/schema/zod';
import { HistoricalCountSchema } from '../../../../api/src/schema/zod/schemas/historicalCountQuery';
import { AvsHistoricalCountSchema } from '../../apiResponseSchema/metrics/historicalCountResponse';

const HistoricalAvsCountResponseSchema = z.object({
    data: z.array(AvsHistoricalCountSchema)
});

export const getHistoricalAvsCount: ZodOpenApiOperationObject = {
    operationId: 'getHistoricalAvsCount',
    summary: 'Retrieve historical count of AVS',
    description: 'Returns the total number of AVS registered at timestamp values',
    tags: ['Metrics'],
    requestParams: {
        query: HistoricalCountSchema,
    },
    responses: {
        '200': {
            description: 'The  total number of AVS registered at timestamp values',
            content: {
                'application/json': {
                    schema: HistoricalAvsCountResponseSchema,
                },
            },
        },
        ...openApiErrorResponses,
    },
};