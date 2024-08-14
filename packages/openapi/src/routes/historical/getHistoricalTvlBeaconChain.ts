import { ZodOpenApiOperationObject } from 'zod-openapi';
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses';
import z from '../../../../api/src/schema/zod';
import { HistoricalCountSchema } from '../../../../api/src/schema/zod/schemas/historicalCountQuery';
import { HistoricalBeaconChainTvlResponseSchema} from '../../apiResponseSchema/metrics/tvlResponse';

const HistoricalBeaconChainTvlCombinedResponseSchema = z.object({
    data: z.array(HistoricalBeaconChainTvlResponseSchema)
});

export const getHistoricalTvlBeaconChain: ZodOpenApiOperationObject = {
    operationId: 'getHistoricalTvlBeaconChain',
    summary: 'Retrieve historical Beacon Chain restaking TVL',
    description: 'Returns the historical total value locked (TVL) in the Beacon Chain restaking EigenPods.',
    tags: ['Metrics'],
    requestParams: {
        query: HistoricalCountSchema
    },
    responses: {
        '200': {
            description: 'The historical data of Beacon Chain restaking TVL in ETH over specified timestamp values.',
            content: {
                'application/json': {
                    schema: HistoricalBeaconChainTvlCombinedResponseSchema,
                },
            },
        },
        ...openApiErrorResponses,
    },
};

