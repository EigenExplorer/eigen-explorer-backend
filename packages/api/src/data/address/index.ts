import type { Chain } from 'viem';
import { holesky } from 'viem/chains';
import { getNetwork } from '../../viem/viemClient';
import { eigenHoleskyContracts } from './eigenHoleskyContracts';
import { eigenContracts } from './eigenMainnetContracts';

export function getEigenContracts(network?: Chain) {
    const chain = network ? network : getNetwork();

    switch (chain) {
        case holesky:
            return eigenHoleskyContracts;
        default:
            return eigenContracts;
    }
}
