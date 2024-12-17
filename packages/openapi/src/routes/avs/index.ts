import { ZodOpenApiPathsObject } from 'zod-openapi'
import { getAllAvsAddresses } from './getAllAvsAddresses'
import { getAllAvs } from './getAllAvs'
import { getAvsByAddress } from './getAvsByAddress'
import { getAvsStakersByAddress } from './getAvsStakersByAddress'
import { getAvsOperatorsByAddress } from './getAvsOperatorsByAddress'
import { getAvsRewards } from './getAvsRewards'
import { getAvsRewardsEvents } from './getAvsRewardsEvents'
import { getAvsRegistrationEvents } from './getAvsRegistrationEvents'

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
	'/avs/{address}/events/registration-status': { get: getAvsRegistrationEvents }
}
