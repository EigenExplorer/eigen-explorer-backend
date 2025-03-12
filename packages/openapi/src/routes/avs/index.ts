import { ZodOpenApiPathsObject } from 'zod-openapi'
import { getAllAvsAddresses } from './getAllAvsAddresses'
import { getAllAvs } from './getAllAvs'
import { getAvsByAddress } from './getAvsByAddress'
import { getAvsStakersByAddress } from './getAvsStakersByAddress'
import { getAvsOperatorsByAddress } from './getAvsOperatorsByAddress'
import { getAvsRewards } from './getAvsRewards'
import { getAvsRewardsEvents } from './getAvsRewardsEvents'
import { getAvsRegistrationEvents } from './getAvsRegistrationEvents'
import { getAvsAllocations } from './getAvsAllocations'
import { getAvsOperatorSetDetails } from './getAvsOperatorSetDetails'
import { getAvsOperatorSets } from './getAvsOperatorSets'
import { getAvsSlashed } from './getAvsSlashed'

export const avsRoutes: ZodOpenApiPathsObject = {
	'/avs': { get: getAllAvs },
	'/avs/addresses': {
		get: getAllAvsAddresses
	},
	'/avs/{address}': { get: getAvsByAddress },
	'/avs/{address}/stakers': { get: getAvsStakersByAddress },
	'/avs/{address}/operators': { get: getAvsOperatorsByAddress },
	'/avs/{address}/rewards': { get: getAvsRewards },
	'/avs/{address}/events/rewards': { get: getAvsRewardsEvents },
	'/avs/{address}/events/registration-status': { get: getAvsRegistrationEvents },
	'/avs/{address}/operator-sets': { get: getAvsOperatorSets },
	'/avs/{address}/operator-set/{operatorSetId}': { get: getAvsOperatorSetDetails },
	'/avs/{address}/allocations': { get: getAvsAllocations },
	'/avs/{address}/slashed': { get: getAvsSlashed }
}
