import prisma from '../../utils/prismaClient';
import type { Request, Response } from 'express';
import { getEigenContracts } from '../../data/address';
import { PaginationQuerySchema } from '../../schema/zod/schemas/paginationQuery';
import { handleAndReturnErrorResponse } from '../../schema/errors';
import { EthereumAddressSchema } from '../../schema/zod/schemas/avs';

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
            include: { operators: true },
        });

        const data = await Promise.all(
            avsRecords.map(async (avs) => {
                const operatorAddresses = avs.operators
                    .filter((o) => o.isActive)
                    .map((o) => o.operatorAddress);

                const totalOperators = operatorAddresses.length;
                const totalStakers = await prisma.staker.count({
                    where: { operatorAddress: { in: operatorAddresses } },
                });

                return {
                    ...avs,
                    totalOperators,
                    totalStakers,
                    operators: undefined,
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
 *
 * @param req
 * @param res
 */
export async function getAVS(req: Request, res: Response) {
    const { avsAddress } = req.params;

    const result = EthereumAddressSchema.safeParse(avsAddress);
    if (!result.success) {
        return handleAndReturnErrorResponse(req, res, result.error);
    }

    try {
        const avs = await prisma.avs.findUniqueOrThrow({
            where: { address: avsAddress },
            include: { operators: true },
        });

        const strategyKeys = Object.keys(getEigenContracts().Strategies);
        const strategyContracts = strategyKeys.map((s) =>
            getEigenContracts().Strategies[s].strategyContract.toLowerCase()
        ) as `0x${string}`[];
        strategyContracts.push('0xbeaC0eeEeeeeEEeEeEEEEeeEEeEeeeEeeEEBEaC0');

        const shares = strategyContracts.map((sc) => ({
            shares: '0',
            strategy: sc,
        }));

        const operatorAddresses = avs.operators
            .filter((o) => o.isActive)
            .map((o) => o.operatorAddress);

        const operatorRecords = await prisma.operator.findMany({
            where: { address: { in: operatorAddresses } },
            select: { shares: true },
        });

        let tvl = 0;
        const totalOperators = operatorAddresses.length;
        const totalStakers = await prisma.staker.count({
            where: { operatorAddress: { in: operatorAddresses } },
        });

        operatorRecords.map((o) => {
            o.shares.map((os) => {
                const foundShare = shares.find(
                    (s) =>
                        s.strategy.toLowerCase() ===
                        os.strategyAddress.toLowerCase()
                );

                if (foundShare) {
                    const shares =
                        BigInt(foundShare.shares) + BigInt(os.shares);
                    foundShare.shares = shares.toString();
                }

                tvl += Number(os.shares) / 1e18;
            });
        });

        res.send({
            ...avs,
            shares,
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
    try {
        // Validate pagination query
        const result = PaginationQuerySchema.safeParse(req.query);
        if (!result.success) {
            return handleAndReturnErrorResponse(req, res, result.error);
        }
        const { skip, take } = result.data;

        const { id } = req.params;
        const avs = await prisma.avs.findUniqueOrThrow({
            where: { address: id },
            include: { operators: true },
        });

        const operatorAddresses = avs.operators
            .filter((o) => o.isActive)
            .map((o) => o.operatorAddress);

        const operatorsCount = await prisma.operator.count({
            where: { address: { in: operatorAddresses } },
        });

        const operatorsRecords = await prisma.operator.findMany({
            where: { address: { in: operatorAddresses } },
            skip,
            take,
            include: { shares: true },
        });

        const data = await Promise.all(
            operatorsRecords.map(async (operator) => {
                let tvl = 0;

                const totalStakers = await prisma.staker.count({
                    where: { operatorAddress: operator.address },
                });

                operator.shares.map((os) => {
                    tvl += Number(BigInt(os.shares)) / 1e18;
                });

                return {
                    ...operator,
                    tvl,
                    totalStakers,
                };
            })
        );

        res.send({
            data,
            meta: {
                total: operatorsCount,
                skip,
                take,
            },
        });
    } catch (error) {
        handleAndReturnErrorResponse(req, res, error);
    }
}
