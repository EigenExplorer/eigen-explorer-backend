import { ZodOpenApiOperationObject } from 'zod-openapi';
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses';
import { DeploymentRatioSchema } from '../../apiResponseSchema/metrics/ratioResponse';

export const getDeploymentRatio: ZodOpenApiOperationObject = {
    operationId: 'getDeploymentRatio',
    summary: 'Retrieve deployment ratio',
    description:
        'Returns deployment ratio, which is calculated as the value of funds delegated to operators in ETH divided by the total EigenLayer TVL.',
    tags: ['Metrics'],
    requestParams: {},
    responses: {
        '200': {
            description: 'The value of deployment ratio',
            content: {
                'application/json': {
                    schema: DeploymentRatioSchema,
                },
            },
        },
        ...openApiErrorResponses,
    },
};
