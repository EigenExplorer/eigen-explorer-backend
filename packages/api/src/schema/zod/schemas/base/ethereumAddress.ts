import z from '../..';

export const EthereumAddressSchema = z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address');
