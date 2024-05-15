import { ZodOpenApiOperationObject } from 'zod-openapi';
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses';
import { TvlResponseSchema } from '../../apiResponseSchema/metrics/tvlResponse';
import z from '../../../../api/src/schema/zod';
import { StrategyTvlSchema } from '../../apiResponseSchema/base/strategyTvlResponse';

const RestakingTvlResponseSchema = TvlResponseSchema.extend({
    tvl: z
        .number()
        .describe('The value of the combined restaking strategy TVL in ETH')
        .openapi({ example: 1000000 }),
    tvlStrategies: StrategyTvlSchema,
});

export const getRestakingTvlMetrics: ZodOpenApiOperationObject = {
    operationId: 'getRestakingTvlMetrics',
    summary: 'Retrieve restaking strategies TVL',
    description:
        'Returns the combined total value locked (TVL) across all restaking strategies, along with a breakdown of the TVL for each individual strategy.',
    tags: ['Metrics'],
    requestParams: {},
    responses: {
        '200': {
            description:
                'The value of combined restaking strategy TVL and a breakdown of the TVL for each individual strategy.',
            content: {
                'application/json': {
                    schema: RestakingTvlResponseSchema,
                },
            },
        },
        ...openApiErrorResponses,
    },
};
