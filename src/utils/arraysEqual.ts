/** Returns true if two arrays hold the same items in the same order. */
export function arraysEqual(a: unknown[], b: unknown[]) {
	if (a.length !== b.length) return false
	for (const [i, item] of a.entries()) if (item !== b[i]) return false
	return true
}
