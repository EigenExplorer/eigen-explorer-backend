import z from '../../../../api/src/schema/zod';
import { ZodOpenApiOperationObject } from 'zod-openapi';
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses';
import { TotalStakersSchema } from '../../apiResponseSchema/metrics/timeChangeResponse';
import { CountOfStakersWithChangeQuerySchema } from '../../../../api/src/schema/zod/schemas/withChangeQuery';

const QuerySchema = z
    .object({})
    .merge(CountOfStakersWithChangeQuerySchema)

export const getTotalStakerssMetric: ZodOpenApiOperationObject = {
    operationId: 'getTotalStakerssMetric',
    summary: 'Retrieve total number of AVS stakers',
    description: 'Returns the total number of AVS stakers registered.',
    tags: ['Metrics'],
    requestParams: { query: QuerySchema },
    responses: {
        '200': {
            description: 'The total number of AVS stakers registered.',
            content: {
                'application/json': {
                    schema: TotalStakersSchema,
                },
            },
        },
        ...openApiErrorResponses,
    },
};
