import type { EigenContractAddress } from '.'

export const eigenContracts: EigenContractAddress = {
	AVSDirectory: '0x135dda560e946695d6f155dacafc6f1f25c1f5af',
	DelegationManager: '0x39053D51B77DC0d36036Fc1fCc8Cb819df8Ef37A',
	Slasher: '0xD92145c07f8Ed1D392c1B88017934E301CC1c3Cd',
	StrategyManager: '0x858646372CC42E1A627fcE94aa7A7033e7CF075A',
	EigenPodManager: '0x91E677b07F7AF907ec9a428aafA9fc14a0d3A338',
	RewardsCoordinator: '0x7750d328b314EfFa365A0402CcfD489B80B0adda',
	AllocationManager: '0x948a420b8CC1d6BFd0B6087C2E7c344a2CD0bc39'
}

// Deprecated
export const eigenLayerMainnetStrategyContracts = {
	cbETH: {
		strategyContract: '0x54945180dB7943c0ed0FEE7EdaB2Bd24620256bc',
		tokenContract: '0xBe9895146f7AF43049ca1c1AE358B0541Ea49704'
	},
	stETH: {
		strategyContract: '0x93c4b944D05dfe6df7645A86cd2206016c51564D',
		tokenContract: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84'
	},
	rETH: {
		strategyContract: '0x1BeE69b7dFFfA4E2d53C2a2Df135C388AD25dCD2',
		tokenContract: '0xae78736Cd615f374D3085123A210448E74Fc6393'
	},
	ETHx: {
		strategyContract: '0x9d7eD45EE2E8FC5482fa2428f15C971e6369011d',
		tokenContract: '0xA35b1B31Ce002FBF2058D22F30f95D405200A15b'
	},
	ankrETH: {
		strategyContract: '0x13760F50a9d7377e4F20CB8CF9e4c26586c658ff',
		tokenContract: '0xE95A203B1a91a908F9B9CE46459d101078c2c3cb'
	},
	oETH: {
		strategyContract: '0xa4C637e0F704745D182e4D38cAb7E7485321d059',
		tokenContract: '0x856c4Efb76C1D1AE02e20CEB03A2A6a08b0b8dC3'
	},
	osETH: {
		strategyContract: '0x57ba429517c3473B6d34CA9aCd56c0e735b94c02',
		tokenContract: '0xf1C9acDc66974dFB6dEcB12aA385b9cD01190E38'
	},
	swETH: {
		strategyContract: '0x0Fe4F44beE93503346A3Ac9EE5A26b130a5796d6',
		tokenContract: '0xf951E335afb289353dc249e82926178EaC7DEd78'
	},
	wBETH: {
		strategyContract: '0x7CA911E83dabf90C90dD3De5411a10F1A6112184',
		tokenContract: '0xa2E3356610840701BDf5611a53974510Ae27E2e1'
	},
	sfrxETH: {
		strategyContract: '0x8CA7A5d6f3acd3A7A8bC468a8CD0FB14B6BD28b6',
		tokenContract: '0xac3E018457B222d93114458476f3E3416Abbe38F'
	},
	lsETH: {
		strategyContract: '0xAe60d8180437b5C34bB956822ac2710972584473',
		tokenContract: '0x8c1BEd5b9a0928467c9B1341Da1D7BD5e10b6549'
	},
	mETH: {
		strategyContract: '0x298aFB19A105D59E74658C4C334Ff360BadE6dd2',
		tokenContract: '0xd5F7838F5C461fefF7FE49ea5ebaF7728bB0ADfa'
	}
}
