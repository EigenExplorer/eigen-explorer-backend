import { ZodOpenApiOperationObject } from 'zod-openapi';
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses';
import z from '../../../../api/src/schema/zod';

const TotalStakersSchema = z.object({
    totalAvs: z
        .number()
        .describe('The total number of AVS stakerss registered')
        .openapi({ example: 1000000 }),
});

export const getTotalStakerssMetric: ZodOpenApiOperationObject = {
    operationId: 'getTotalStakerssMetric',
    summary: 'Retrieve total number of AVS stakers',
    description: 'Returns the total number of AVS stakers registered.',
    tags: ['Metrics'],
    requestParams: {},
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
