import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses';
import z from '../../../../api/src/schema/zod';
import { EthereumAddressSchema } from '../../../../api/src/schema/zod/schemas/base/ethereumAddress';
import { AvsDetailsSchema } from '../../apiResponseSchema/avs/avsResponse';
import { ZodOpenApiOperationObject } from 'zod-openapi';

const EthereumAddressParam = z.object({
    address: EthereumAddressSchema,
});

export const getAvsByAddress: ZodOpenApiOperationObject = {
    operationId: 'getAvsByAddress',
    summary: 'Retrieve an AVS by address',
    description: 'Returns a single AVS record by address.',
    tags: ['AVS'],
    requestParams: {
        path: EthereumAddressParam,
    },
    responses: {
        '200': {
            description: 'The AVS record found.',
            content: {
                'application/json': {
                    schema: z.array(AvsDetailsSchema),
                },
            },
        },
        ...openApiErrorResponses,
    },
};
