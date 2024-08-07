import { ZodOpenApiOperationObject } from 'zod-openapi';
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses';
import z from '../../../../api/src/schema/zod';
import { HistoricalCountSchema } from '../../../../api/src/schema/zod/schemas/historicalCountQuery';
import { AvsHistoricCountSchema } from '../../apiResponseSchema/avs/avsHistoricCountSchema';

const HistorialAvsCountResponseSchema = z.object({
    data: z.array(AvsHistoricCountSchema)
});

export const getHistoricalAvsCount: ZodOpenApiOperationObject = {
    operationId: 'getHistoricalAvsCount',
    summary: 'Retrieve historic count of AVS',
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
                    schema: HistorialAvsCountResponseSchema,
                },
            },
        },
        ...openApiErrorResponses,
    },
};