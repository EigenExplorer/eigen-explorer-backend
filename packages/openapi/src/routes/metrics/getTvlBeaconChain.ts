import { ZodOpenApiOperationObject } from 'zod-openapi';
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses';
import { BeaconChainTvlResponseSchema } from '../../apiResponseSchema/metrics/tvlResponse';

export const getBeaconChainTvlMetric: ZodOpenApiOperationObject = {
    operationId: 'getBeaconChainTvlMetric',
    summary: 'Retrieve Beacon Chain restaking TVL',
    description:
        'Returns the total value locked (TVL) in the Beacon Chain restaking EigenPods',
    tags: ['Metrics'],
    requestParams: {},
    responses: {
        '200': {
            description: 'The value of the Beacon Chain restaking TVL in ETH',
            content: {
                'application/json': {
                    schema: BeaconChainTvlResponseSchema,
                },
            },
        },
        ...openApiErrorResponses,
    },
};
