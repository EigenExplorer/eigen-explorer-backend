declare global {
	interface BigInt {
		toJSON(): number
	}
}

BigInt.prototype.toJSON = function () {
	return Number(this)
}

export {}
