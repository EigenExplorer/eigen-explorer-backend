import { ZodOpenApiOperationObject } from 'zod-openapi';
import z from '../../../../api/src/schema/zod';

const VersionResponseSchema = z.object({
    version: z
        .string()
        .describe('The version of the API server')
        .openapi({ example: 'v0.0.1' }),
});

export const getVersion: ZodOpenApiOperationObject = {
    operationId: 'getVersion',
    summary: 'Retrieve API server version',
    description: 'Returns API server version.',
    tags: ['System'],
    requestParams: {},
    responses: {
        '200': {
            description: 'The API server version.',
            content: {
                'application/json': {
                    schema: VersionResponseSchema,
                },
            },
        },
    },
};
