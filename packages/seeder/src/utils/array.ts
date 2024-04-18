export function chunkArray(array, chunkSize = 1000) {
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const chunks: any = []
	for (let i = 0; i < array.length; i += chunkSize) {
		chunks.push(array.slice(i, i + chunkSize))
	}
	return chunks
}
