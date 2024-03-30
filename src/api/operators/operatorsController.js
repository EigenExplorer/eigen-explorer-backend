import blsPublicKeyCompendiumAbi from '@/data/blsPublicKeyCompendiumAbis.json'
import coordinatorAbi from '@/data/coordinatorAbis.json'
import delegationManagerAbi from '@/data/delegationManagerAbis.json'
import indexRegistryAbi from '@/data/indexRegistryAbis.json'
import slasherAbi from '@/data/slasherAbis.json'
import { IStrategy } from '@/interfaces/generic'
import { IProtocolContracts } from '@/interfaces/protocol'

export function useOperatorsData(
	id,
	strategy,
	contracts
) {
	async function load() {


		const operatorIds = (await readContract({
			address: contracts.indexRegistry as `0x${string}`,
			abi: indexRegistryAbi.abi as Abi,
			functionName: 'getOperatorListForQuorumAtBlockNumber',
			args: [0, await fetchBlockNumber()]
		})) as string[]

		let runningTvl = 0

		setOperators(
			await Promise.all(
				operatorIds.map(async (o) => {
					const operatorAddress = await readContract({
						address: contracts.blsPubkeyCompendium as `0x${string}`,
						abi: blsPublicKeyCompendiumAbi.abi as Abi,
						functionName: 'pubkeyHashToOperator',
						args: [o]
					})

					const operatorStatusData = await readContract({
						address: contracts.registryCoordinator as `0x${string}`,
						abi: coordinatorAbi.abi as Abi,
						functionName: 'getOperator',
						args: [operatorAddress]
					})

					const operatorShares = await readContract({
						address: contracts.delegationManager as `0x${string}`,
						abi: delegationManagerAbi.abi as Abi,
						functionName: 'operatorShares',
						args: [operatorAddress, strategy.id]
					})

					const slasherData = await readContracts({
						contracts: [
							{
								address: contracts.slasher as `0x${string}`,
								abi: slasherAbi.abi as Abi,
								functionName: 'canSlash',
								args: [operatorAddress as any, id]
							},
							{
								address: contracts.slasher as `0x${string}`,
								abi: slasherAbi.abi as Abi,
								functionName: 'isFrozen',
								args: [operatorAddress as any]
							}
						]
					})

					runningTvl += Number(operatorShares)

					return {
						address: operatorAddress,
						status: (operatorStatusData as any).status,
						shares: Number(operatorShares),
						isSlashable: slasherData[0].result,
						isFrozen: slasherData[1].result
					}
				})
			)
		)

		setTvl(runningTvl)
		setIsLoading(false)
	}

	useEffect(() => {
		load()
	}, [strategy, contracts])

	return {
		operators,
		tvl,
		isLoading,
		isError: !!error,
		error
	}
}