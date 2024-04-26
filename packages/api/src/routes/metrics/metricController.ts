import type { Request, Response } from 'express';
import prisma from '../../utils/prismaClient';
import { getContract } from 'viem';
import { getViemClient } from '../../viem/viemClient';
import { strategyAbi } from '../../data/abi/strategy';
import { getEigenContracts } from '../../data/address';
import { handleAndReturnErrorResponse } from '../../schema/errors';

/**
 * Route to get explorer metrics
 *
 * @param req
 * @param res
 */
export async function getMetrics(req: Request, res: Response) {
    try {
        const tvlRestaking = await doGetTvl();
        const tvlBeaconChain = await doGetTvlBeaconChain();

        res.send({
            tvl: tvlRestaking.tvlRestaking + tvlBeaconChain,
            ...tvlRestaking,
            tvlBeaconChain: await doGetTvlBeaconChain(),
            totalAvs: await doGetTotalAvsCount(),
            totalOperators: await doGetTotalOperatorCount(),
            totalStakers: await doGetTotalStakerCount(),
        });
    } catch (error) {
        handleAndReturnErrorResponse(req, res, error);
    }
}

export async function getTvl(req: Request, res: Response) {
    try {
        const tvlRestaking = (await doGetTvl()).tvlRestaking;
        const tvlBeaconChain = await doGetTvlBeaconChain();

        res.send({
            tvl: tvlRestaking + tvlBeaconChain,
        });
    } catch (error) {
        handleAndReturnErrorResponse(req, res, error);
    }
}

export async function getTvlBeaconChain(req: Request, res: Response) {
    try {
        const tvlBeaconChain = await doGetTvlBeaconChain();

        res.send({
            tvl: tvlBeaconChain,
        });
    } catch (error) {
        handleAndReturnErrorResponse(req, res, error);
    }
}

export async function getTvlRestaking(req: Request, res: Response) {
    try {
        const tvlRestaking = await doGetTvl();

        res.send({
            tvl: tvlRestaking.tvlRestaking,
            tvlStrategies: tvlRestaking.tvlStrategies,
        });
    } catch (error) {
        handleAndReturnErrorResponse(req, res, error);
    }
}

export async function getTvlRestakingByStrategy(req: Request, res: Response) {
    try {
        const { strategy } = req.params;
        const strategies = Object.keys(getEigenContracts().Strategies);

        if (strategy && strategies.indexOf(strategy) !== -1) {
            const tvl = await doGetTvlStrategy(
                getEigenContracts().Strategies[strategy].strategyContract
            );

            res.send({
                tvl,
            });
        }
    } catch (error) {
        handleAndReturnErrorResponse(req, res, error);
    }
}

export async function getTotalAvs(req: Request, res: Response) {
    try {
        const totalAvs = await doGetTotalAvsCount();

        res.send({
            totalAvs,
        });
    } catch (error) {
        handleAndReturnErrorResponse(req, res, error);
    }
}

export async function getTotalOperators(req: Request, res: Response) {
    try {
        const totalOperators = await doGetTotalOperatorCount();

        res.send({
            totalOperators,
        });
    } catch (error) {
        handleAndReturnErrorResponse(req, res, error);
    }
}

export async function getTotalStakers(req: Request, res: Response) {
    try {
        const totalStakers = await doGetTotalStakerCount();

        res.send({
            totalStakers,
        });
    } catch (error) {
        handleAndReturnErrorResponse(req, res, error);
    }
}

// ================================================

async function doGetTvl() {
    let tvlRestaking = 0;
    const tvlStrategies = {};
    const strategies = Object.keys(getEigenContracts().Strategies);
    const strategiesContracts = strategies.map((s) =>
        getContract({
            address: getEigenContracts().Strategies[s].strategyContract,
            abi: strategyAbi,
            client: getViemClient(),
        })
    );

    try {
        const totalShares = await Promise.all(
            strategiesContracts.map((sc) => sc.read.totalShares())
        );

        const underlyingShares = await Promise.all(
            strategiesContracts.map((sc, i) =>
                sc.read.sharesToUnderlyingView([totalShares[i]])
            )
        );

        strategies.map((s, i) => {
            const strategyTvl = Number(underlyingShares[i]) / 1e18;

            tvlStrategies[s] = strategyTvl;
            tvlRestaking += strategyTvl;
        });
    } catch (error) {}

    return {
        tvlRestaking,
        tvlStrategies,
    };
}

async function doGetTvlStrategy(strategy: `0x${string}`) {
    let tvl = 0;

    try {
        const contract = getContract({
            address: strategy,
            abi: strategyAbi,
            client: getViemClient(),
        });

        tvl =
            Number(
                await contract.read.sharesToUnderlyingView([
                    await contract.read.totalShares(),
                ])
            ) / 1e18;
    } catch (error) {}

    return tvl;
}

async function doGetTvlBeaconChain() {
    const totalViews = await prisma.validator.aggregate({
        _sum: {
            effectiveBalance: true,
        },
    });

    return Number(totalViews._sum.effectiveBalance) / 1e9;
}

async function doGetTotalAvsCount() {
    return await prisma.avs.count();
}

async function doGetTotalOperatorCount() {
    return await prisma.operator.count();
}

async function doGetTotalStakerCount() {
    const stakers = await prisma.staker.count({
        where: { operatorAddress: { not: null } },
    });

    return stakers;
}
