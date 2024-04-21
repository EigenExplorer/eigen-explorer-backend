import z from '../';

export const PaginationQuerySchema = z.object({
    skip: z.number().min(0).default(0),
    take: z.number().min(1).default(12),
});
