import { ZodOpenApiPathsObject } from 'zod-openapi';
import { getAllAvsAddresses } from './getAllAvsAddresses';
import { getAllAvs } from './getAllAvs';
import { getAvsByAddress } from './getAvsByAddress';
import { getAvsStakersByAddress } from './getAvsStakersByAddress';
import { getAvsOperatorsByAddress } from './getAvsOperatorsByAddress';

export const avsRoutes: ZodOpenApiPathsObject = {
    '/avs/addresses': {
        get: getAllAvsAddresses,
    },
    '/avs': { get: getAllAvs },
    '/avs/:address': { get: getAvsByAddress },
    '/avs/:address/stakers': { get: getAvsStakersByAddress },
    '/avs/:address/operators': { get: getAvsOperatorsByAddress },
};
