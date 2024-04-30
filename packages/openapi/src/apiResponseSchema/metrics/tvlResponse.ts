import z from '../../../../api/src/schema/zod';

export const TvlResponseSchema = z.object({
    tvl: z.number().openapi({ example: 1000000 }),
});
