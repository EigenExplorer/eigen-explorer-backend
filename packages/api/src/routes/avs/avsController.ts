import prisma from '../../utils/prismaClient';
import type { Request, Response } from 'express';
import { PaginationQuerySchema } from '../../schema/zod/schemas/paginationQuery';
import { handleAndReturnErrorResponse } from '../../schema/errors';
import { EthereumAddressSchema } from '../../schema/zod/schemas/avs';
import {
    withOperatorTvl,
    withOperatorTvlAndShares,
} from '../operators/operatorController';
import { IMap } from '../../schema/generic';

/**
 * Route to get a list of all AVSs
 *
 * @param req
 * @param res
 */
export async function getAllAVS(req: Request, res: Response) {
    // Validate pagination query
    const result = PaginationQuerySchema.safeParse(req.query);
    if (!result.success) {
        return handleAndReturnErrorResponse(req, res, result.error);
    }
    const { skip, take } = result.data;

    try {
        // Fetch count and record
        const avsCount = await prisma.avs.count();
        const avsRecords = await prisma.avs.findMany({
            skip,
            take,
            include: {
                operators: {
                    where: { isActive: true },
                    include: {
                        operator: {
                            include: {
                                shares: true,
                            },
                        },
                    },
                },
            },
        });

        const data = await Promise.all(
            avsRecords.map(async (avs) => {
                let tvl = 0;

                const totalOperators = avs.operators.length;
                const totalStakers = await prisma.staker.count({
                    where: {
                        operatorAddress: {
                            in: avs.operators.map((o) => o.operatorAddress),
                        },
                    },
                });

                avs.operators.map((avsOperator) => {
                    const operator = withOperatorTvl(avsOperator.operator);

                    tvl += operator.tvl;
                });

                return {
                    ...avs,
                    operators: undefined,
                    tvl,
                    totalOperators,
                    totalStakers,
                };
            })
        );

        res.send({
            data,
            meta: {
                total: avsCount,
                skip,
                take,
            },
        });
    } catch (error) {
        handleAndReturnErrorResponse(req, res, error);
    }
}

/**
 * Route to get a list of all AVS and their addresses
 *
 * @param req
 * @param res
 */
export async function getAllAVSAddresses(req: Request, res: Response) {
    // Validate pagination query
    const result = PaginationQuerySchema.safeParse(req.query);
    if (!result.success) {
        return handleAndReturnErrorResponse(req, res, result.error);
    }
    const { skip, take } = result.data;

    try {
        // Fetch count and records
        const avsCount = await prisma.avs.count();
        const avsRecords = await prisma.avs.findMany({ skip, take });

        // Simplified map (assuming avs.address is not asynchronous)
        const data = avsRecords.map((avs) => ({
            name: avs.metadataName,
            address: avs.address,
        }));

        // Send response with data and metadata
        res.send({
            data,
            meta: {
                total: avsCount,
                skip,
                take,
            },
        });
    } catch (error) {
        handleAndReturnErrorResponse(req, res, error);
    }
}

/**
 * Route to get a single AVS by address
 * Route to get a single AVS by address
 *
 * @param req
 * @param res
 */
export async function getAVS(req: Request, res: Response) {
    const { address } = req.params;
    console.log('avsAddress', address);

    const result = EthereumAddressSchema.safeParse(address);
    if (!result.success) {
        return handleAndReturnErrorResponse(req, res, result.error);
    }

    console.log(result);

    console.log(result);

    try {
        const avs = await prisma.avs.findUniqueOrThrow({
            where: { address: id },
            include: {
                operators: {
                    where: { isActive: true },
                    include: {
                        operator: {
                            include: {
                                shares: true,
                            },
                        },
                    },
                },
            },
        });

        let tvl = 0;
        const sharesMap: IMap<string, string> = new Map();
        const totalOperators = avs.operators.length;
        const totalStakers = await prisma.staker.count({
            where: {
                operatorAddress: {
                    in: avs.operators.map((o) => o.operatorAddress),
                },
            },
        });

        avs.operators.map((avsOperator) => {
            const operator = withOperatorTvlAndShares(avsOperator.operator);

            operator.shares.map((s) => {
                if (!sharesMap.has(s.strategyAddress)) {
                    sharesMap.set(s.strategyAddress, '0');
                }

                sharesMap.set(
                    s.strategyAddress,
                    (
                        BigInt(sharesMap.get(s.strategyAddress)) +
                        BigInt(s.shares)
                    ).toString()
                );
            });

            tvl += operator.tvl;
        });

        res.send({
            ...avs,
            shares: Array.from(sharesMap, ([strategyAddress, shares]) => ({
                strategyAddress,
                shares,
            })),
            tvl,
            totalOperators,
            totalStakers,
            operators: undefined,
        });
    } catch (error) {
        handleAndReturnErrorResponse(req, res, error);
    }
}

/**
 * Route to get all AVS stakers
 *
 * @param req
 * @param res
 * @returns
 */
export async function getAVSStakers(req: Request, res: Response) {
    // Validate pagination query
    const result = PaginationQuerySchema.safeParse(req.query);
    if (!result.success) {
        return handleAndReturnErrorResponse(req, res, result.error);
    }
    const { skip, take } = result.data;

    try {
        const { id } = req.params;
        const avs = await prisma.avs.findUniqueOrThrow({
            where: { address: id },
            include: { operators: true },
        });

        const operatorAddresses = avs.operators
            .filter((o) => o.isActive)
            .map((o) => o.operatorAddress);

        const stakersCount = await prisma.staker.count({
            where: { operatorAddress: { in: operatorAddresses } },
        });

        const stakersRecords = await prisma.staker.findMany({
            where: { operatorAddress: { in: operatorAddresses } },
            skip,
            take,
            include: { shares: true },
        });

        const data = await Promise.all(
            stakersRecords.map((staker) => {
                let tvl = 0;

                staker.shares.map((ss) => {
                    tvl += Number(BigInt(ss.shares)) / 1e18;
                });

                return {
                    ...staker,
                    tvl,
                };
            })
        );

        res.send({
            data,
            meta: {
                total: stakersCount,
                skip,
                take,
            },
        });
    } catch (error) {
        handleAndReturnErrorResponse(req, res, error);
    }
}

/**
 * Route to get all AVS operators
 *
 * @param req
 * @param res
 * @returns
 */
export async function getAVSOperators(req: Request, res: Response) {
    console.log(req.query);
    // Validate pagination query
    console.log(req.query);
    // Validate pagination query
    const result = PaginationQuerySchema.safeParse(req.query);
    if (!result.success) {
        return handleAndReturnErrorResponse(req, res, result.error);
    }
    console.log(result);
    console.log(result);
    const { skip, take } = result.data;

    try {
        const { id } = req.params;
        const avs = await prisma.avs.findUniqueOrThrow({
            where: { address: id },
            include: {
                operators: {
                    where: { isActive: true },
                },
            },
        });

        const operatorsRecords = await prisma.operator.findMany({
            where: {
                address: { in: avs.operators.map((o) => o.operatorAddress) },
            },
            skip,
            take,
            include: {
                shares: true,
                stakers: true,
            },
        });

        const data = operatorsRecords
            .map((operator) => ({
                ...operator,
                stakers: undefined,
                totalStakers: operator.stakers.length,
            }))
            .map((operator) => withOperatorTvl(operator));

        res.send({
            data,
            meta: {
                total: avs.operators.length,
                skip,
                take,
            },
        });
    } catch (error) {
        handleAndReturnErrorResponse(req, res, error);
    }
}
