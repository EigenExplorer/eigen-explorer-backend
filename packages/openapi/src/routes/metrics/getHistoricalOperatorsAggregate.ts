import { ZodOpenApiOperationObject } from 'zod-openapi';
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses';
import z from '../../../../api/src/schema/zod';
import { HistoricalCountSchema } from '../../../../api/src/schema/zod/schemas/historicalCountQuery';
import { EthereumAddressSchema } from '../../../../api/src/schema/zod/schemas/base/ethereumAddress';
import { OperatorsHistoricAggregateSchema } from '../../apiResponseSchema/operator/OperatorsHistoricAggregateSchema';

const HistorialOperatorsAggregateResponseSchema = z.object({
    data: z.array(OperatorsHistoricAggregateSchema)
});

const EthereumAddressParam = z.object({
    address: EthereumAddressSchema,
});

export const getHistoricalOperatorsAggregate: ZodOpenApiOperationObject = {
    operationId: 'getHistoricalOperatorsAggregate',
    summary: 'Retrieve Historical Operator Aggregate Data',
    description: 'Returns historical aggregate data for an operator including TVL and total number of stakers at specified timestamp values',
    tags: ['Metrics'],
    requestParams: {
        query: HistoricalCountSchema,
        path: EthereumAddressParam,
    },
    responses: {
        '200': {
            description: 'The historical aggregate data for an operator including TVL and total number of stakers at specified timestamp values',
            content: {
                'application/json': {
                    schema: HistorialOperatorsAggregateResponseSchema,
                },
            },
        },
        ...openApiErrorResponses,
    },
};
