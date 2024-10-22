import { ZodOpenApiPathsObject } from 'zod-openapi'
import { getAllOperators } from './getAllOperators'
import { getOperatorByAddress } from './getOperatorByAddress'
import { getAllOperatorAddresses } from './getAllOperatorAddresses'

export const operatorsRoutes: ZodOpenApiPathsObject = {
	'/operators': { get: getAllOperators },
	'/operators/addresses': { get: getAllOperatorAddresses },
	'/operators/{address}': { get: getOperatorByAddress }
}
