import { ZodOpenApiOperationObject } from 'zod-openapi';
import z from '../../../../api/src/schema/zod';
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses';
import { HistoricalCountSchema } from '../../../../api/src/schema/zod/schemas/historicalCountQuery'

const HistoricalAvsSchema = z.object({
  ts: z.string().datetime().describe('Timestamp in ISO 8601 format'),
  value: z.number().describe('AVS count at the given timestamp')
}).openapi({
  example: {
    ts: "2024-07-09T03:00:00.000Z",
    value: 20
  }
});

const HistoricalDataResponseSchema = z.object({
  data: z.array(HistoricalAvsSchema).describe('Array of historical AVS data points'),
});

export const getHistoricalAvsCount: ZodOpenApiOperationObject = {
  operationId: 'getHistoricalAvsCount',
  summary: 'Retrieve historical AVS data',
  description: 'Returns the historical number of AVS registered. ',
  tags: ['Metrics'],
  requestParams: {
    query:HistoricalCountSchema
  },
  responses: {
    '200': {
      description: 'The historical AVS data.',
      content: {
        'application/json': {
          schema: HistoricalDataResponseSchema,
        },
      },
    },
    ...openApiErrorResponses,
  },
};
