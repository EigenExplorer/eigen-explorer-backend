import z from '../';
import { OperatorMetaDataSchema } from './base/operatorMetaData';

const ShareSchema = z.object({
    shares: z.string(),
    strategy: z.string(),
});

const SharesSchema = z.array(ShareSchema);

const DataSchema = z.object({
    metadata: OperatorMetaDataSchema,
    curatedMetadata: z.nullable(z.unknown()),
    shares: SharesSchema,
    id: z.string(),
    address: z.string(),
    totalStakers: z.number(),
    tvl: z.number(),
});

export default DataSchema;
