import { ZodOpenApiPathsObject } from 'zod-openapi'
import { getAllOperators } from './getAllOperators'
import { getOperatorByAddress } from './getOperatorByAddress'
import { getAllOperatorAddresses } from './getAllOperatorAddresses'
import { getOperatorRewards } from './getOperatorRewards'
import { getOperatorDelegationEvents } from './getOperatorDelegationEvents'
import { getOperatorRegistrationEvents } from './getOperatorRegistrationEvents'
import { getOperatorAllocationDelay } from './getOperatorAllocationDelay'
import { getOperatorAllocations } from './getOperatorAllocations'
import { getOperatorMagnitudes } from './getOperatorMagnitudes'
import { getOperatorOperatorSets } from './getOperatorOperatorSets'
import { getOperatorSlashed } from './getOperatorSlashed'

export const operatorsRoutes: ZodOpenApiPathsObject = {
	'/operators': { get: getAllOperators },
	'/operators/addresses': { get: getAllOperatorAddresses },
	'/operators/{address}': { get: getOperatorByAddress },
	'/operators/{address}/rewards': { get: getOperatorRewards },
	'/operators/{address}/events/delegation': { get: getOperatorDelegationEvents },
	'/operators/{address}/events/registration-status': { get: getOperatorRegistrationEvents },
	'/operators/{address}/operator-sets': { get: getOperatorOperatorSets },
	'/operators/{address}/allocations': { get: getOperatorAllocations },
	'/operators/{address}/slashed': { get: getOperatorSlashed },
	'/operators/{address}/magnitudes': { get: getOperatorMagnitudes },
	'/operators/{address}/allocation-delay': { get: getOperatorAllocationDelay }
}
