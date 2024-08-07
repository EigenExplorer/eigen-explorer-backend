import { ZodOpenApiOperationObject } from 'zod-openapi';
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses';
import z from '../../../../api/src/schema/zod';
import { HistoricalCountSchema } from '../../../../api/src/schema/zod/schemas/historicalCountQuery';
import { StakerHistoricCountSchema } from '../../apiResponseSchema/staker/stakerHistoricCountSchema';

const HistorialStakerCountResponseSchema = z.object({
    data: z.array(StakerHistoricCountSchema)
});

export const getHistoricalStakerCount: ZodOpenApiOperationObject = {
    operationId: 'getHistoricalStakerCount',
    summary: 'Retrieve historic count of AVS stakers',
    description: 'Returns the total number of AVS stakers registered at timestamp values',
    tags: ['Metrics'],
    requestParams: {
        query: HistoricalCountSchema,
    },
    responses: {
        '200': {
            description: 'The total number of AVS stakers registered at timestamp values',
            content: {
                'application/json': {
                    schema: HistorialStakerCountResponseSchema,
                },
            },
        },
        ...openApiErrorResponses,
    },
};