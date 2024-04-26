import type { Request, Response } from 'express';
import prisma from '../../utils/prismaClient';
// import { PaginationQuerySchema } from '../../schema/generic'
import { PaginationQuerySchema } from '../../schema/zod/schemas/paginationQuery';
import { handleAndReturnErrorResponse } from '../../schema/errors';

/**
 * Route to get a list of all operators
 *
 * @param req
 * @param res
 */
export async function getAllOperators(req: Request, res: Response) {
    // Validate pagination query
    const result = PaginationQuerySchema.safeParse(req.query);
    if (!result.success) {
        return handleAndReturnErrorResponse(req, res, result.error);
    }
    const { skip, take } = result.data;

    try {
        // Fetch count and record
        const operatorCount = await prisma.operator.count();
        const operatorRecords = await prisma.operator.findMany({
            skip,
            take,
            include: { shares: true },
        });

        const operators = await Promise.all(
            operatorRecords.map(async (operator) => {
                let tvl = 0;
                const shares = operator.shares;
                const totalStakers = await prisma.staker.count({
                    where: { operatorAddress: operator.address },
                });

                shares.map((s) => {
                    tvl += Number(s.shares) / 1e18;
                });

                return {
                    ...operator,
                    tvl,
                    totalStakers,
                    stakers: undefined,
                };
            })
        );

        res.send({
            data: operators,
            meta: {
                total: operatorCount,
                skip,
                take,
            },
        });
    } catch (error) {
        handleAndReturnErrorResponse(req, res, error);
    }
}

/**
 * Route to get a single operator
 *
 * @param req
 * @param res
 */
export async function getOperator(req: Request, res: Response) {
    try {
        const { id } = req.params;

        const operator = await prisma.operator.findUniqueOrThrow({
            where: { address: id },
            include: { shares: true },
        });

        const totalStakers = await prisma.staker.count({
            where: { operatorAddress: operator.address },
        });

        let tvl = 0;
        const shares = operator.shares;

        shares.map((s) => {
            tvl += Number(s.shares) / 1e18;
        });

        res.send({
            ...operator,
            tvl,
            totalStakers,
            stakers: undefined,
        });
    } catch (error) {
        handleAndReturnErrorResponse(req, res, error);
    }
}
