import { ZodOpenApiOperationObject } from 'zod-openapi';
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses';
import z from '../../../../api/src/schema/zod';
import { HistoricalCountSchema } from '../../../../api/src/schema/zod/schemas/historicalCountQuery';
import { EthereumAddressSchema } from '../../../../api/src/schema/zod/schemas/base/ethereumAddress';
import { AvsHistoricAggregateSchema } from '../../apiResponseSchema/avs/avsHistoricAggregateSchema';

const HistorialAvsAggregateResponseSchema = z.object({
    data: z.array(AvsHistoricAggregateSchema)
});

const EthereumAddressParam = z.object({
    address: EthereumAddressSchema,
});

export const getHistoricalAvsAggregate: ZodOpenApiOperationObject = {
    operationId: 'getHistoricalAvsAggregate',
    summary: 'Retrieve Historical AVS Aggregate Data',
    description: 'Returns historical aggregate data for an AVS including TVL, total number of stakers, and total number of operators at specified timestamp values',
    tags: ['Metrics'],
    requestParams: {
        query: HistoricalCountSchema,
        path: EthereumAddressParam,
    },
    responses: {
        '200': {
            description: 'The historical aggregate data for an AVS including TVL, total number of stakers, and total number of operators at specified timestamp values',
            content: {
                'application/json': {
                    schema: HistorialAvsAggregateResponseSchema,
                },
            },
        },
        ...openApiErrorResponses,
    },
};