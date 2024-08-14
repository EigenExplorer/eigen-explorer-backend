import { ZodOpenApiOperationObject } from 'zod-openapi';
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses';
import z from '../../../../api/src/schema/zod';
import { HistoricalCountSchema } from '../../../../api/src/schema/zod/schemas/historicalCountQuery';
import { EthereumAddressSchema } from '../../../../api/src/schema/zod/schemas/base/ethereumAddress';
import { AvsHistoricalAggregateSchema } from '../../apiResponseSchema/metrics/historicalAggregateResponse';

const HistoricalAvsAggregateResponseSchema = z.object({
    data: z.array(AvsHistoricalAggregateSchema)
});

const AvsAddressParam = z.object({
    address: EthereumAddressSchema.describe(
        'The address of the AVS '
    ).openapi({ example: '0x870679e138bcdf293b7ff14dd44b70fc97e12fc0' }),
});

export const getHistoricalAvsAggregate: ZodOpenApiOperationObject = {
    operationId: 'getHistoricalAvsAggregate',
    summary: 'Retrieve historical AVS aggregate data',
    description: 'Returns historical aggregate data for an AVS including TVL, total number of stakers, and total number of operators at specified timestamp values.',
    tags: ['Metrics'],
    requestParams: {
        query: HistoricalCountSchema,
        path: AvsAddressParam,
    },
    responses: {
        '200': {
            description: 'The historical aggregate data for an AVS including TVL, total number of stakers, and total number of operators at specified timestamp values.',
            content: {
                'application/json': {
                    schema: HistoricalAvsAggregateResponseSchema,
                },
            },
        },
        ...openApiErrorResponses,
    },
};