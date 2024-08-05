import z from '../../../../api/src/schema/zod';

export const Change24HoursResponseSchema = z.object({
    value: z.number().openapi({ example: 10 }),
    percent: z.number().openapi({ example: 0.01})
});

export const Change7DaysResponseSchema = z.object({
    value: z.number().openapi({ example: 10 }),
    percent: z.number().openapi({ example: 0.01 })
});
