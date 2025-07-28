import { holesky } from 'viem/chains'
import { IMap } from '../schema/generic'
import { getNetwork } from '../viem/viemClient'

export function withOperatorShares(avsOperators) {
	const sharesMap: IMap<string, string> = new Map()

	avsOperators.map((avsOperator) => {
		const shares = avsOperator.operator.shares.filter(
			(s) => true
			// TODO: Add back with operator set strategies
			// avsOperator.restakedStrategies.indexOf(s.strategyAddress.toLowerCase()) !== -1
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
