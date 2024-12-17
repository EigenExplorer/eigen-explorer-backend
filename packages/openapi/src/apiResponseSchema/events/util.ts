import z from '../../../../api/src/schema/zod'

// Refinement Utility Function
export const applyAllRefinements = (
	schema: z.ZodTypeAny,
	refinements: Array<(schema: z.ZodTypeAny) => z.ZodTypeAny>
) => {
	return refinements.reduce((refinedSchema, refineFn) => refineFn(refinedSchema), schema)
}
