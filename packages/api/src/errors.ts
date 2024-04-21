import z from './zod';
import { ZodError } from 'zod';
import { generateErrorMessage } from 'zod-error';
import { ZodOpenApiResponseObject } from 'zod-openapi';
import { Request, Response } from 'express';

/*
 * Zod type definitions
 */
export const ErrorCode = z.enum([
    'bad_request',
    'not_found',
    'internal_server_error',
    'unauthorized',
    'forbidden',
    'rate_limit_exceeded',
    'unprocessable_entity',
]);

const errorCodeToHttpStatus: Record<z.infer<typeof ErrorCode>, number> = {
    bad_request: 400,
    unauthorized: 401,
    forbidden: 403,
    not_found: 404,
    unprocessable_entity: 422,
    rate_limit_exceeded: 429,
    internal_server_error: 500,
};

const ErrorSchema = z.object({
    error: z.object({
        code: ErrorCode.openapi({
            description: 'A short code indicating the error code returned.',
            example: 'not_found',
        }),
        message: z.string().openapi({
            description: 'A human readable error message.',
            example: 'The requested resource was not found.',
        }),
        doc_url: z.string().optional().openapi({
            description:
                'A URL to more information about the error code reported.',
            example: 'https://docs.eigenexplorer.com/api-reference/errors',
        }),
    }),
});

export type ErrorResponse = z.infer<typeof ErrorSchema>;
export type ErrorCodes = z.infer<typeof ErrorCode>;
const docErrorUrl = 'https://docs.eigenexplorer.com/api-reference/errors';

// Custom error class for API errors
export class EigenExplorerApiError extends Error {
    public readonly code: z.infer<typeof ErrorCode>;
    public readonly docUrl?: string;

    constructor({
        code,
        message,
        docUrl,
    }: {
        code: z.infer<typeof ErrorCode>;
        message: string;
        docUrl?: string;
    }) {
        super(message);
        this.code = code;
        this.docUrl = docUrl ?? `${docErrorUrl}#${code}`;
    }
}

// Convert ZodError to an error response
export function fromZodError(error: ZodError): ErrorResponse {
    return {
        error: {
            code: 'unprocessable_entity',
            message: generateErrorMessage(error.issues, {
                maxErrors: 1,
                delimiter: {
                    component: ': ',
                },
                path: {
                    enabled: true,
                    type: 'objectNotation',
                    label: '',
                },
                code: {
                    enabled: true,
                    label: '',
                },
                message: {
                    enabled: true,
                    label: '',
                },
            }),
            doc_url: `${docErrorUrl}#unprocessable_entity`,
        },
    };
}

// Handle API errors
export function handleApiError(error: any): ErrorResponse & { status: number } {
    console.error('API error occurred', error);

    // Zod errors
    if (error instanceof ZodError) {
        return {
            ...fromZodError(error),
            status: errorCodeToHttpStatus.unprocessable_entity,
        };
    }

    // DubApiError errors
    if (error instanceof EigenExplorerApiError) {
        return {
            error: {
                code: error.code,
                message: error.message,
                doc_url: error.docUrl,
            },
            status: errorCodeToHttpStatus[error.code],
        };
    }

    // Fallback
    // Unhandled errors are not user-facing, so we don't expose the actual error
    return {
        error: {
            code: 'internal_server_error',
            message:
                'An internal server error occurred. Please contact our support if the problem persists.',
            doc_url: `${docErrorUrl}#internal_server_error`,
        },
        status: 500,
    };
}

export function handleAndReturnErrorResponse(
    req: Request,
    res: Response,
    err: unknown
) {
    const { error, status } = handleApiError(err);
    return res.status(status).json({ error });
}

// Schema factory for openapi error response
export const errorSchemaFactory = (
    code: z.infer<typeof ErrorCode>,
    description: string
): ZodOpenApiResponseObject => {
    return {
        description,
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties: {
                        error: {
                            type: 'object',
                            properties: {
                                code: {
                                    type: 'string',
                                    enum: [code],
                                    description:
                                        'A short code indicating the error code returned.',
                                    example: code,
                                },
                                message: {
                                    type: 'string',
                                    description:
                                        'A human readable explanation of what went wrong.',
                                    example:
                                        'The requested resource was not found.',
                                },
                                doc_url: {
                                    type: 'string',
                                    description:
                                        'A link to our documentation with more details about this error code',
                                    example: `${docErrorUrl}#${code}`,
                                },
                            },
                            required: ['code', 'message'],
                        },
                    },
                    required: ['error'],
                },
            },
        },
    };
};
