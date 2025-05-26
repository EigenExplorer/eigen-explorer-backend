import prisma from '@prisma/client'

/**
 * Distributes a certain amount of tokens based on an array of relative weights
 * Returns an array with token amounts in corresponding indices
 *
 * @param totalAmount - The total amount to distribute
 * @param multipliers - Array of relative weights
 * @returns Array of distributed amounts
 */
export function distributeAmount(
	totalAmount: prisma.Prisma.Decimal,
	multipliers: string[]
): prisma.Prisma.Decimal[] {
	const totalMultiplier = multipliers.reduce(
		(sum, m) => sum.add(new prisma.Prisma.Decimal(m)),
		new prisma.Prisma.Decimal(0)
	)
	return multipliers.map((multiplier) =>
		new prisma.Prisma.Decimal(multiplier).mul(totalAmount).div(totalMultiplier)
	)
}
