import type { EigenContractAddress } from '.'

export const eigenHoleskyContracts: EigenContractAddress = {
	AVSDirectory: '0x055733000064333CaDDbC92763c58BF0192fFeBf',
	DelegationManager: '0xA44151489861Fe9e3055d95adC98FbD462B948e7',
	Slasher: '0xcAe751b75833ef09627549868A04E32679386e7C',
	StrategyManager: '0xdfB5f6CE42aAA7830E94ECFCcAd411beF4d4D5b6',
	EigenPodManager: '0x30770d7E3e71112d7A6b7259542D1f680a70e315',
	Strategies: {
		WETH: {
			strategyContract: '0x80528D6e9A2BAbFc766965E0E26d5aB08D9CFaF9',
			tokenContract: '0x94373a4919B3240D86eA41593D5eBa789FEF3848'
		},
		cbETH: {
			strategyContract: '0x70eb4d3c164a6b4a5f908d4fbb5a9caffb66bab6',
			tokenContract: '0x8720095Fa5739Ab051799211B146a2EEE4Dd8B37'
		},
		stETH: {
			strategyContract: '0x7D704507b76571a51d9caE8AdDAbBFd0ba0e63d3',
			tokenContract: '0x3F1c547b21f65e10480dE3ad8E19fAAC46C95034'
		},
		rETH: {
			strategyContract: '0x3A8fBdf9e77DFc25d09741f51d3E181b25d0c4E0',
			tokenContract: '0x7322c24752f79c05FFD1E2a6FCB97020C1C264F1'
		},
		ETHx: {
			strategyContract: '0x31b6f59e1627cefc9fa174ad03859fc337666af7',
			tokenContract: '0xB4F5fc289a778B80392b86fa70A7111E5bE0F859'
		},
		ankrETH: {
			strategyContract: '0x7673a47463f80c6a3553db9e54c8cdcd5313d0ac',
			tokenContract: '0x8783C9C904e1bdC87d9168AE703c8481E8a477Fd '
		},
		osETH: {
			strategyContract: '0x46281e3b7fdcacdba44cadf069a94a588fd4c6ef',
			tokenContract: '0xF603c5A3F774F05d4D848A9bB139809790890864'
		},
		sfrxETH: {
			strategyContract: '0x9281ff96637710Cd9A5CAcce9c6FAD8C9F54631c',
			tokenContract: '0xa63f56985F9C7F3bc9fFc5685535649e0C1a55f3'
		},
		lsETH: {
			strategyContract: '0x05037A81BD7B4C9E0F7B430f1F2A22c31a2FD943',
			tokenContract: '0x1d8b30cC38Dba8aBce1ac29Ea27d9cFd05379A09'
		},
		mETH: {
			strategyContract: '0xaccc5A86732BE85b5012e8614AF237801636F8e5',
			tokenContract: '0xe3C063B1BEe9de02eb28352b55D49D85514C67FF'
		}
	}
}
