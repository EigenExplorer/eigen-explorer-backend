import { ZodOpenApiOperationObject } from 'zod-openapi';
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses';
import z from '../../../../api/src/schema/zod';
import { HistoricalCountSchema } from '../../../../api/src/schema/zod/schemas/historicalCountQuery';
import { HistoricalIndividualStrategyTvlResponseSchema} from '../../apiResponseSchema/metrics/tvlResponse';
import { EthereumAddressSchema } from '../../../../api/src/schema/zod/schemas/base/ethereumAddress';

const HistoricalIndividualStrategyTvlCombinedResponseSchema = z.object({
    data: z.array(HistoricalIndividualStrategyTvlResponseSchema)
});

const RestakingStrategyAddressParam = z.object({
    address: EthereumAddressSchema.describe(
        'The address of the Strategy'
    ).openapi({ example: '0xacb55c530acdb2849e6d4f36992cd8c9d50ed8f7' }),
});

export const getHistoricalTvlRestaking: ZodOpenApiOperationObject = {
    operationId: 'getHistoricalTvlRestaking',
    summary: 'Retrieve Historical TVL Data by Strategy Address.',
    description: 'Returns the historical total value locked (TVL) data over specified timestamp values in a specific LST strategy.',
    tags: ['Metrics'],
    requestParams: {
        query: HistoricalCountSchema,
        path: RestakingStrategyAddressParam,
    },
    responses: {
        '200': {
            description: 'The historical data of TVL for the specified strategy over specified timestamp values.',
            content: {
                'application/json': {
                    schema: HistoricalIndividualStrategyTvlCombinedResponseSchema,
                },
            },
        },
        ...openApiErrorResponses,
    },
};

