import type { EigenContractAddress } from "."

export const eigenHoleskyContracts: EigenContractAddress = {
	AVSDirectory: '0x055733000064333CaDDbC92763c58BF0192fFeBf',
	DelegationManager: '0xA44151489861Fe9e3055d95adC98FbD462B948e7',
	Slasher: '0xcAe751b75833ef09627549868A04E32679386e7C',
	StrategyManager: '0xdfB5f6CE42aAA7830E94ECFCcAd411beF4d4D5b6',
	Strategies: {
		WETH: {
			strategyContract: '0x80528d6e9a2babfc766965e0e26d5ab08d9cfaf9',
			tokenContract: '0xBe9895146f7AF43049ca1c1AE358B0541Ea49704'
		},
		cbETH: {
			strategyContract: '0x70EB4D3c164a6B4A5f908D4FBb5a9cAfFb66bAB6',
			tokenContract: '0xBe9895146f7AF43049ca1c1AE358B0541Ea49704'
		},
		stETH: {
			strategyContract: '0x7d704507b76571a51d9cae8addabbfd0ba0e63d3',
			tokenContract: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84'
		},
		rETH: {
			strategyContract: '0x1BeE69b7dFFfA4E2d53C2a2Df135C388AD25dCD2',
			tokenContract: '0xae78736Cd615f374D3085123A210448E74Fc6393'
		},
		ETHx: {
			strategyContract: '0x31b6f59e1627cefc9fa174ad03859fc337666af7',
			tokenContract: '0xA35b1B31Ce002FBF2058D22F30f95D405200A15b'
		},
		ankrETH: {
			strategyContract: '0x7673a47463f80c6a3553db9e54c8cdcd5313d0ac',
			tokenContract: '0xE95A203B1a91a908F9B9CE46459d101078c2c3cb'
		},
		oETH: {
			strategyContract: '0xa4C637e0F704745D182e4D38cAb7E7485321d059',
			tokenContract: '0x856c4Efb76C1D1AE02e20CEB03A2A6a08b0b8dC3'
		},
		osETH: {
			strategyContract: '0x46281e3b7fdcacdba44cadf069a94a588fd4c6ef',
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
			strategyContract: '0x9281ff96637710cd9a5cacce9c6fad8c9f54631c',
			tokenContract: '0xac3E018457B222d93114458476f3E3416Abbe38F'
		},
		lsETH: {
			strategyContract: '0xAe60d8180437b5C34bB956822ac2710972584473',
			tokenContract: '0x8c1BEd5b9a0928467c9B1341Da1D7BD5e10b6549'
		},
		mETH: {
			strategyContract: '0xaccc5a86732be85b5012e8614af237801636f8e5',
			tokenContract: '0xd5F7838F5C461fefF7FE49ea5ebaF7728bB0ADfa'
		}
	}
}

// Deprecated
export const eigenHoleskyContractAddresses: { [key: string]: `0x${string}` } = {
	AVSDirectory: '0x055733000064333CaDDbC92763c58BF0192fFeBf',
	DelegationManager: '0xA44151489861Fe9e3055d95adC98FbD462B948e7',
	Slasher: '0xcAe751b75833ef09627549868A04E32679386e7C',
	StrategyManager: '0xdfB5f6CE42aAA7830E94ECFCcAd411beF4d4D5b6'
}

// Deprecated
export const eigenLayerHoleskyStrategyContracts = {
	WETH: {
		strategyContract: '0x80528d6e9a2babfc766965e0e26d5ab08d9cfaf9',
		tokenContract: '0xBe9895146f7AF43049ca1c1AE358B0541Ea49704'
	},
	stETH: {
		strategyContract: '0x7d704507b76571a51d9cae8addabbfd0ba0e63d3',
		tokenContract: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84'
	},
	rETH: {
		strategyContract: '0x1BeE69b7dFFfA4E2d53C2a2Df135C388AD25dCD2',
		tokenContract: '0xae78736Cd615f374D3085123A210448E74Fc6393'
	},
	ETHx: {
		strategyContract: '0x31b6f59e1627cefc9fa174ad03859fc337666af7',
		tokenContract: '0xA35b1B31Ce002FBF2058D22F30f95D405200A15b'
	},
	ankrETH: {
		strategyContract: '0x7673a47463f80c6a3553db9e54c8cdcd5313d0ac',
		tokenContract: '0xE95A203B1a91a908F9B9CE46459d101078c2c3cb'
	},
	oETH: {
		strategyContract: '0xa4C637e0F704745D182e4D38cAb7E7485321d059',
		tokenContract: '0x856c4Efb76C1D1AE02e20CEB03A2A6a08b0b8dC3'
	},
	osETH: {
		strategyContract: '0x46281e3b7fdcacdba44cadf069a94a588fd4c6ef',
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
		strategyContract: '0x9281ff96637710cd9a5cacce9c6fad8c9f54631c',
		tokenContract: '0xac3E018457B222d93114458476f3E3416Abbe38F'
	},
	lsETH: {
		strategyContract: '0xAe60d8180437b5C34bB956822ac2710972584473',
		tokenContract: '0x8c1BEd5b9a0928467c9B1341Da1D7BD5e10b6549'
	},
	mETH: {
		strategyContract: '0xaccc5a86732be85b5012e8614af237801636f8e5',
		tokenContract: '0xd5F7838F5C461fefF7FE49ea5ebaF7728bB0ADfa'
	}
}
