import { holesky } from 'viem/chains'
import { IMap } from '../schema/generic'
import { getNetwork } from '../viem/viemClient'

export function withOperatorShares(avsOperators) {
	const sharesMap: IMap<string, string> = new Map()

	avsOperators.map((avsOperator) => {
		// TODO: Add back with operator set strategies
		// TODO: Select whether to use operator set strategies or all strategies
		// const shares = avsOperator.operator.shares.filter((s) => true)
		const shares = avsOperator.operator.shares.filter(
			(s) => avsOperator.restakedStrategies.indexOf(s.strategyAddress.toLowerCase()) !== -1
		)

		shares.map((s) => {
			if (!sharesMap.has(s.strategyAddress)) {
				sharesMap.set(s.strategyAddress, '0')
			}

			sharesMap.set(
				s.strategyAddress,
				(BigInt(sharesMap.get(s.strategyAddress)) + BigInt(s.shares)).toString()
			)
		})
	})

	return Array.from(sharesMap, ([strategyAddress, shares]) => ({
		strategyAddress,
		shares
	}))
}

export function getLatestActiveOperatorSplits(splits): Record<string, Record<string, number>> {
	const splitMap: Record<string, Record<string, number>> = {}

	for (const { operatorAddress, avsAddress, splitBips } of splits) {
		if (!splitMap[operatorAddress]) splitMap[operatorAddress] = {}

		if (!(avsAddress in splitMap[operatorAddress])) {
			splitMap[operatorAddress][avsAddress] = splitBips / 100
		}
	}

	return splitMap
}
