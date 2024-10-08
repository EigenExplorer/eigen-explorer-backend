export const lsEthAbi = [
	{
		inputs: [
			{ internalType: 'address', name: '_from', type: 'address' },
			{ internalType: 'address', name: '_operator', type: 'address' },
			{ internalType: 'uint256', name: '_allowance', type: 'uint256' },
			{ internalType: 'uint256', name: '_value', type: 'uint256' }
		],
		name: 'AllowanceTooLow',
		type: 'error'
	},
	{ inputs: [], name: 'BalanceTooLow', type: 'error' },
	{
		inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
		name: 'Denied',
		type: 'error'
	},
	{ inputs: [], name: 'EmptyDeposit', type: 'error' },
	{ inputs: [], name: 'ErrorOnDeposit', type: 'error' },
	{ inputs: [], name: 'InconsistentPublicKeys', type: 'error' },
	{ inputs: [], name: 'InconsistentSignatures', type: 'error' },
	{ inputs: [], name: 'InvalidArgument', type: 'error' },
	{ inputs: [], name: 'InvalidCall', type: 'error' },
	{
		inputs: [
			{
				internalType: 'uint256',
				name: 'currentValidatorsExitedBalance',
				type: 'uint256'
			},
			{
				internalType: 'uint256',
				name: 'newValidatorsExitedBalance',
				type: 'uint256'
			}
		],
		name: 'InvalidDecreasingValidatorsExitedBalance',
		type: 'error'
	},
	{
		inputs: [
			{
				internalType: 'uint256',
				name: 'currentValidatorsSkimmedBalance',
				type: 'uint256'
			},
			{
				internalType: 'uint256',
				name: 'newValidatorsSkimmedBalance',
				type: 'uint256'
			}
		],
		name: 'InvalidDecreasingValidatorsSkimmedBalance',
		type: 'error'
	},
	{ inputs: [], name: 'InvalidEmptyString', type: 'error' },
	{
		inputs: [{ internalType: 'uint256', name: 'epoch', type: 'uint256' }],
		name: 'InvalidEpoch',
		type: 'error'
	},
	{ inputs: [], name: 'InvalidFee', type: 'error' },
	{
		inputs: [
			{ internalType: 'uint256', name: 'version', type: 'uint256' },
			{
				internalType: 'uint256',
				name: 'expectedVersion',
				type: 'uint256'
			}
		],
		name: 'InvalidInitialization',
		type: 'error'
	},
	{ inputs: [], name: 'InvalidPublicKeyCount', type: 'error' },
	{
		inputs: [
			{ internalType: 'uint256', name: 'requested', type: 'uint256' },
			{ internalType: 'uint256', name: 'received', type: 'uint256' }
		],
		name: 'InvalidPulledClFundsAmount',
		type: 'error'
	},
	{ inputs: [], name: 'InvalidSignatureCount', type: 'error' },
	{
		inputs: [
			{
				internalType: 'uint256',
				name: 'providedValidatorCount',
				type: 'uint256'
			},
			{
				internalType: 'uint256',
				name: 'depositedValidatorCount',
				type: 'uint256'
			},
			{
				internalType: 'uint256',
				name: 'lastReportedValidatorCount',
				type: 'uint256'
			}
		],
		name: 'InvalidValidatorCountReport',
		type: 'error'
	},
	{ inputs: [], name: 'InvalidWithdrawalCredentials', type: 'error' },
	{ inputs: [], name: 'InvalidZeroAddress', type: 'error' },
	{ inputs: [], name: 'NoAvailableValidatorKeys', type: 'error' },
	{ inputs: [], name: 'NotEnoughFunds', type: 'error' },
	{ inputs: [], name: 'NullTransfer', type: 'error' },
	{ inputs: [], name: 'SliceOutOfBounds', type: 'error' },
	{ inputs: [], name: 'SliceOverflow', type: 'error' },
	{
		inputs: [
			{
				internalType: 'uint256',
				name: 'prevTotalEthIncludingExited',
				type: 'uint256'
			},
			{
				internalType: 'uint256',
				name: 'postTotalEthIncludingExited',
				type: 'uint256'
			},
			{ internalType: 'uint256', name: 'timeElapsed', type: 'uint256' },
			{
				internalType: 'uint256',
				name: 'relativeLowerBound',
				type: 'uint256'
			}
		],
		name: 'TotalValidatorBalanceDecreaseOutOfBound',
		type: 'error'
	},
	{
		inputs: [
			{
				internalType: 'uint256',
				name: 'prevTotalEthIncludingExited',
				type: 'uint256'
			},
			{
				internalType: 'uint256',
				name: 'postTotalEthIncludingExited',
				type: 'uint256'
			},
			{ internalType: 'uint256', name: 'timeElapsed', type: 'uint256' },
			{
				internalType: 'uint256',
				name: 'annualAprUpperBound',
				type: 'uint256'
			}
		],
		name: 'TotalValidatorBalanceIncreaseOutOfBound',
		type: 'error'
	},
	{
		inputs: [{ internalType: 'address', name: 'caller', type: 'address' }],
		name: 'Unauthorized',
		type: 'error'
	},
	{
		inputs: [
			{ internalType: 'address', name: '_from', type: 'address' },
			{ internalType: 'address', name: '_to', type: 'address' }
		],
		name: 'UnauthorizedTransfer',
		type: 'error'
	},
	{ inputs: [], name: 'ZeroMintedShares', type: 'error' },
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: 'address',
				name: 'owner',
				type: 'address'
			},
			{
				indexed: true,
				internalType: 'address',
				name: 'spender',
				type: 'address'
			},
			{
				indexed: false,
				internalType: 'uint256',
				name: 'value',
				type: 'uint256'
			}
		],
		name: 'Approval',
		type: 'event'
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: false,
				internalType: 'uint256',
				name: 'validatorCount',
				type: 'uint256'
			},
			{
				indexed: false,
				internalType: 'uint256',
				name: 'validatorTotalBalance',
				type: 'uint256'
			},
			{
				indexed: false,
				internalType: 'bytes32',
				name: 'roundId',
				type: 'bytes32'
			}
		],
		name: 'ConsensusLayerDataUpdate',
		type: 'event'
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: false,
				internalType: 'uint256',
				name: 'version',
				type: 'uint256'
			},
			{
				indexed: false,
				internalType: 'bytes',
				name: 'cdata',
				type: 'bytes'
			}
		],
		name: 'Initialize',
		type: 'event'
	},
	{
		anonymous: false,
		inputs: [
			{
				components: [
					{ internalType: 'uint256', name: 'epoch', type: 'uint256' },
					{
						internalType: 'uint256',
						name: 'validatorsBalance',
						type: 'uint256'
					},
					{
						internalType: 'uint256',
						name: 'validatorsSkimmedBalance',
						type: 'uint256'
					},
					{
						internalType: 'uint256',
						name: 'validatorsExitedBalance',
						type: 'uint256'
					},
					{
						internalType: 'uint256',
						name: 'validatorsExitingBalance',
						type: 'uint256'
					},
					{
						internalType: 'uint32',
						name: 'validatorsCount',
						type: 'uint32'
					},
					{
						internalType: 'uint32[]',
						name: 'stoppedValidatorCountPerOperator',
						type: 'uint32[]'
					},
					{
						internalType: 'bool',
						name: 'rebalanceDepositToRedeemMode',
						type: 'bool'
					},
					{
						internalType: 'bool',
						name: 'slashingContainmentMode',
						type: 'bool'
					}
				],
				indexed: false,
				internalType: 'struct IOracleManagerV1.ConsensusLayerReport',
				name: 'report',
				type: 'tuple'
			},
			{
				components: [
					{
						internalType: 'uint256',
						name: 'rewards',
						type: 'uint256'
					},
					{
						internalType: 'uint256',
						name: 'pulledELFees',
						type: 'uint256'
					},
					{
						internalType: 'uint256',
						name: 'pulledRedeemManagerExceedingEthBuffer',
						type: 'uint256'
					},
					{
						internalType: 'uint256',
						name: 'pulledCoverageFunds',
						type: 'uint256'
					}
				],
				indexed: false,
				internalType: 'struct IOracleManagerV1.ConsensusLayerDataReportingTrace',
				name: 'trace',
				type: 'tuple'
			}
		],
		name: 'ProcessedConsensusLayerReport',
		type: 'event'
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: false,
				internalType: 'uint256',
				name: 'pulledSkimmedEthAmount',
				type: 'uint256'
			},
			{
				indexed: false,
				internalType: 'uint256',
				name: 'pullExitedEthAmount',
				type: 'uint256'
			}
		],
		name: 'PulledCLFunds',
		type: 'event'
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: false,
				internalType: 'uint256',
				name: 'amount',
				type: 'uint256'
			}
		],
		name: 'PulledCoverageFunds',
		type: 'event'
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: false,
				internalType: 'uint256',
				name: 'amount',
				type: 'uint256'
			}
		],
		name: 'PulledELFees',
		type: 'event'
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: false,
				internalType: 'uint256',
				name: 'amount',
				type: 'uint256'
			}
		],
		name: 'PulledRedeemManagerExceedingEth',
		type: 'event'
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: false,
				internalType: 'uint256',
				name: 'redeemManagerDemand',
				type: 'uint256'
			},
			{
				indexed: false,
				internalType: 'uint256',
				name: 'suppliedRedeemManagerDemand',
				type: 'uint256'
			},
			{
				indexed: false,
				internalType: 'uint256',
				name: 'suppliedRedeemManagerDemandInEth',
				type: 'uint256'
			}
		],
		name: 'ReportedRedeemManager',
		type: 'event'
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: 'address',
				name: '_collector',
				type: 'address'
			},
			{
				indexed: false,
				internalType: 'uint256',
				name: '_oldTotalUnderlyingBalance',
				type: 'uint256'
			},
			{
				indexed: false,
				internalType: 'uint256',
				name: '_oldTotalSupply',
				type: 'uint256'
			},
			{
				indexed: false,
				internalType: 'uint256',
				name: '_newTotalUnderlyingBalance',
				type: 'uint256'
			},
			{
				indexed: false,
				internalType: 'uint256',
				name: '_newTotalSupply',
				type: 'uint256'
			}
		],
		name: 'RewardsEarned',
		type: 'event'
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: 'address',
				name: 'admin',
				type: 'address'
			}
		],
		name: 'SetAdmin',
		type: 'event'
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: 'address',
				name: 'allowlist',
				type: 'address'
			}
		],
		name: 'SetAllowlist',
		type: 'event'
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: false,
				internalType: 'uint256',
				name: 'oldAmount',
				type: 'uint256'
			},
			{
				indexed: false,
				internalType: 'uint256',
				name: 'newAmount',
				type: 'uint256'
			}
		],
		name: 'SetBalanceCommittedToDeposit',
		type: 'event'
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: false,
				internalType: 'uint256',
				name: 'oldAmount',
				type: 'uint256'
			},
			{
				indexed: false,
				internalType: 'uint256',
				name: 'newAmount',
				type: 'uint256'
			}
		],
		name: 'SetBalanceToDeposit',
		type: 'event'
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: false,
				internalType: 'uint256',
				name: 'oldAmount',
				type: 'uint256'
			},
			{
				indexed: false,
				internalType: 'uint256',
				name: 'newAmount',
				type: 'uint256'
			}
		],
		name: 'SetBalanceToRedeem',
		type: 'event'
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: false,
				internalType: 'uint256',
				name: 'annualAprUpperBound',
				type: 'uint256'
			},
			{
				indexed: false,
				internalType: 'uint256',
				name: 'relativeLowerBound',
				type: 'uint256'
			}
		],
		name: 'SetBounds',
		type: 'event'
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: 'address',
				name: 'collector',
				type: 'address'
			}
		],
		name: 'SetCollector',
		type: 'event'
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: 'address',
				name: 'coverageFund',
				type: 'address'
			}
		],
		name: 'SetCoverageFund',
		type: 'event'
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: 'address',
				name: 'depositContract',
				type: 'address'
			}
		],
		name: 'SetDepositContractAddress',
		type: 'event'
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: false,
				internalType: 'uint256',
				name: 'oldDepositedValidatorCount',
				type: 'uint256'
			},
			{
				indexed: false,
				internalType: 'uint256',
				name: 'newDepositedValidatorCount',
				type: 'uint256'
			}
		],
		name: 'SetDepositedValidatorCount',
		type: 'event'
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: 'address',
				name: 'elFeeRecipient',
				type: 'address'
			}
		],
		name: 'SetELFeeRecipient',
		type: 'event'
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: false,
				internalType: 'uint256',
				name: 'fee',
				type: 'uint256'
			}
		],
		name: 'SetGlobalFee',
		type: 'event'
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: false,
				internalType: 'uint256',
				name: 'minNetAmount',
				type: 'uint256'
			},
			{
				indexed: false,
				internalType: 'uint256',
				name: 'maxRelativeAmount',
				type: 'uint256'
			}
		],
		name: 'SetMaxDailyCommittableAmounts',
		type: 'event'
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: false,
				internalType: 'string',
				name: 'metadataURI',
				type: 'string'
			}
		],
		name: 'SetMetadataURI',
		type: 'event'
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: 'address',
				name: 'operatorRegistry',
				type: 'address'
			}
		],
		name: 'SetOperatorsRegistry',
		type: 'event'
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: 'address',
				name: 'oracleAddress',
				type: 'address'
			}
		],
		name: 'SetOracle',
		type: 'event'
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: 'address',
				name: 'pendingAdmin',
				type: 'address'
			}
		],
		name: 'SetPendingAdmin',
		type: 'event'
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: false,
				internalType: 'address',
				name: 'redeemManager',
				type: 'address'
			}
		],
		name: 'SetRedeemManager',
		type: 'event'
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: false,
				internalType: 'uint64',
				name: 'epochsPerFrame',
				type: 'uint64'
			},
			{
				indexed: false,
				internalType: 'uint64',
				name: 'slotsPerEpoch',
				type: 'uint64'
			},
			{
				indexed: false,
				internalType: 'uint64',
				name: 'secondsPerSlot',
				type: 'uint64'
			},
			{
				indexed: false,
				internalType: 'uint64',
				name: 'genesisTime',
				type: 'uint64'
			},
			{
				indexed: false,
				internalType: 'uint64',
				name: 'epochsToAssumedFinality',
				type: 'uint64'
			}
		],
		name: 'SetSpec',
		type: 'event'
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: false,
				internalType: 'uint256',
				name: 'totalSupply',
				type: 'uint256'
			}
		],
		name: 'SetTotalSupply',
		type: 'event'
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: false,
				internalType: 'bytes32',
				name: 'withdrawalCredentials',
				type: 'bytes32'
			}
		],
		name: 'SetWithdrawalCredentials',
		type: 'event'
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: 'address',
				name: 'from',
				type: 'address'
			},
			{
				indexed: true,
				internalType: 'address',
				name: 'to',
				type: 'address'
			},
			{
				indexed: false,
				internalType: 'uint256',
				name: 'value',
				type: 'uint256'
			}
		],
		name: 'Transfer',
		type: 'event'
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: 'address',
				name: 'depositor',
				type: 'address'
			},
			{
				indexed: true,
				internalType: 'address',
				name: 'recipient',
				type: 'address'
			},
			{
				indexed: false,
				internalType: 'uint256',
				name: 'amount',
				type: 'uint256'
			}
		],
		name: 'UserDeposit',
		type: 'event'
	},
	{ stateMutability: 'payable', type: 'fallback' },
	{
		inputs: [],
		name: 'DEPOSIT_SIZE',
		outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'PUBLIC_KEY_LENGTH',
		outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'SIGNATURE_LENGTH',
		outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: '_DEPOSIT_SIZE',
		outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'acceptAdmin',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{
		inputs: [
			{ internalType: 'address', name: '_owner', type: 'address' },
			{ internalType: 'address', name: '_spender', type: 'address' }
		],
		name: 'allowance',
		outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [
			{ internalType: 'address', name: '_spender', type: 'address' },
			{ internalType: 'uint256', name: '_value', type: 'uint256' }
		],
		name: 'approve',
		outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{
		inputs: [{ internalType: 'address', name: '_owner', type: 'address' }],
		name: 'balanceOf',
		outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [{ internalType: 'address', name: '_owner', type: 'address' }],
		name: 'balanceOfUnderlying',
		outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [
			{
				internalType: 'uint32[]',
				name: '_redeemRequestIds',
				type: 'uint32[]'
			},
			{
				internalType: 'uint32[]',
				name: '_withdrawalEventIds',
				type: 'uint32[]'
			}
		],
		name: 'claimRedeemRequests',
		outputs: [{ internalType: 'uint8[]', name: 'claimStatuses', type: 'uint8[]' }],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{
		inputs: [],
		name: 'decimals',
		outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
		stateMutability: 'pure',
		type: 'function'
	},
	{
		inputs: [
			{ internalType: 'address', name: '_spender', type: 'address' },
			{
				internalType: 'uint256',
				name: '_subtractableValue',
				type: 'uint256'
			}
		],
		name: 'decreaseAllowance',
		outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{
		inputs: [],
		name: 'deposit',
		outputs: [],
		stateMutability: 'payable',
		type: 'function'
	},
	{
		inputs: [{ internalType: 'address', name: '_recipient', type: 'address' }],
		name: 'depositAndTransfer',
		outputs: [],
		stateMutability: 'payable',
		type: 'function'
	},
	{
		inputs: [{ internalType: 'uint256', name: '_maxCount', type: 'uint256' }],
		name: 'depositToConsensusLayer',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{
		inputs: [],
		name: 'getAdmin',
		outputs: [{ internalType: 'address', name: '', type: 'address' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'getAllowlist',
		outputs: [{ internalType: 'address', name: '', type: 'address' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'getBalanceToDeposit',
		outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'getBalanceToRedeem',
		outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'getCLSpec',
		outputs: [
			{
				components: [
					{
						internalType: 'uint64',
						name: 'epochsPerFrame',
						type: 'uint64'
					},
					{
						internalType: 'uint64',
						name: 'slotsPerEpoch',
						type: 'uint64'
					},
					{
						internalType: 'uint64',
						name: 'secondsPerSlot',
						type: 'uint64'
					},
					{
						internalType: 'uint64',
						name: 'genesisTime',
						type: 'uint64'
					},
					{
						internalType: 'uint64',
						name: 'epochsToAssumedFinality',
						type: 'uint64'
					}
				],
				internalType: 'struct CLSpec.CLSpecStruct',
				name: '',
				type: 'tuple'
			}
		],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'getCLValidatorCount',
		outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'getCLValidatorTotalBalance',
		outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'getCollector',
		outputs: [{ internalType: 'address', name: '', type: 'address' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'getCommittedBalance',
		outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'getCoverageFund',
		outputs: [{ internalType: 'address', name: '', type: 'address' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'getCurrentEpochId',
		outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'getCurrentFrame',
		outputs: [
			{ internalType: 'uint256', name: '_startEpochId', type: 'uint256' },
			{ internalType: 'uint256', name: '_startTime', type: 'uint256' },
			{ internalType: 'uint256', name: '_endTime', type: 'uint256' }
		],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'getDailyCommittableLimits',
		outputs: [
			{
				components: [
					{
						internalType: 'uint128',
						name: 'minDailyNetCommittableAmount',
						type: 'uint128'
					},
					{
						internalType: 'uint128',
						name: 'maxDailyRelativeCommittableAmount',
						type: 'uint128'
					}
				],
				internalType: 'struct DailyCommittableLimits.DailyCommittableLimitsStruct',
				name: '',
				type: 'tuple'
			}
		],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'getDepositedValidatorCount',
		outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'getELFeeRecipient',
		outputs: [{ internalType: 'address', name: '', type: 'address' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'getExpectedEpochId',
		outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [{ internalType: 'uint256', name: '_epochId', type: 'uint256' }],
		name: 'getFrameFirstEpochId',
		outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'getGlobalFee',
		outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'getLastCompletedEpochId',
		outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'getLastConsensusLayerReport',
		outputs: [
			{
				components: [
					{ internalType: 'uint256', name: 'epoch', type: 'uint256' },
					{
						internalType: 'uint256',
						name: 'validatorsBalance',
						type: 'uint256'
					},
					{
						internalType: 'uint256',
						name: 'validatorsSkimmedBalance',
						type: 'uint256'
					},
					{
						internalType: 'uint256',
						name: 'validatorsExitedBalance',
						type: 'uint256'
					},
					{
						internalType: 'uint256',
						name: 'validatorsExitingBalance',
						type: 'uint256'
					},
					{
						internalType: 'uint32',
						name: 'validatorsCount',
						type: 'uint32'
					},
					{
						internalType: 'bool',
						name: 'rebalanceDepositToRedeemMode',
						type: 'bool'
					},
					{
						internalType: 'bool',
						name: 'slashingContainmentMode',
						type: 'bool'
					}
				],
				internalType: 'struct IOracleManagerV1.StoredConsensusLayerReport',
				name: '',
				type: 'tuple'
			}
		],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'getMetadataURI',
		outputs: [{ internalType: 'string', name: '', type: 'string' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'getOperatorsRegistry',
		outputs: [{ internalType: 'address', name: '', type: 'address' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'getOracle',
		outputs: [{ internalType: 'address', name: '', type: 'address' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'getPendingAdmin',
		outputs: [{ internalType: 'address', name: '', type: 'address' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'getRedeemManager',
		outputs: [{ internalType: 'address', name: '', type: 'address' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'getReportBounds',
		outputs: [
			{
				components: [
					{
						internalType: 'uint256',
						name: 'annualAprUpperBound',
						type: 'uint256'
					},
					{
						internalType: 'uint256',
						name: 'relativeLowerBound',
						type: 'uint256'
					}
				],
				internalType: 'struct ReportBounds.ReportBoundsStruct',
				name: '',
				type: 'tuple'
			}
		],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'getTime',
		outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'getWithdrawalCredentials',
		outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [
			{ internalType: 'address', name: '_spender', type: 'address' },
			{
				internalType: 'uint256',
				name: '_additionalValue',
				type: 'uint256'
			}
		],
		name: 'increaseAllowance',
		outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{
		inputs: [
			{
				internalType: 'address',
				name: '_depositContractAddress',
				type: 'address'
			},
			{
				internalType: 'address',
				name: '_elFeeRecipientAddress',
				type: 'address'
			},
			{
				internalType: 'bytes32',
				name: '_withdrawalCredentials',
				type: 'bytes32'
			},
			{
				internalType: 'address',
				name: '_oracleAddress',
				type: 'address'
			},
			{
				internalType: 'address',
				name: '_systemAdministratorAddress',
				type: 'address'
			},
			{
				internalType: 'address',
				name: '_allowlistAddress',
				type: 'address'
			},
			{
				internalType: 'address',
				name: '_operatorRegistryAddress',
				type: 'address'
			},
			{
				internalType: 'address',
				name: '_collectorAddress',
				type: 'address'
			},
			{ internalType: 'uint256', name: '_globalFee', type: 'uint256' }
		],
		name: 'initRiverV1',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{
		inputs: [
			{
				internalType: 'address',
				name: '_redeemManager',
				type: 'address'
			},
			{ internalType: 'uint64', name: '_epochsPerFrame', type: 'uint64' },
			{ internalType: 'uint64', name: '_slotsPerEpoch', type: 'uint64' },
			{ internalType: 'uint64', name: '_secondsPerSlot', type: 'uint64' },
			{ internalType: 'uint64', name: '_genesisTime', type: 'uint64' },
			{
				internalType: 'uint64',
				name: '_epochsToAssumedFinality',
				type: 'uint64'
			},
			{
				internalType: 'uint256',
				name: '_annualAprUpperBound',
				type: 'uint256'
			},
			{
				internalType: 'uint256',
				name: '_relativeLowerBound',
				type: 'uint256'
			},
			{
				internalType: 'uint128',
				name: '_minDailyNetCommittableAmount_',
				type: 'uint128'
			},
			{
				internalType: 'uint128',
				name: '_maxDailyRelativeCommittableAmount_',
				type: 'uint128'
			}
		],
		name: 'initRiverV1_1',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{
		inputs: [],
		name: 'initRiverV1_2',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{
		inputs: [{ internalType: 'uint256', name: '_epoch', type: 'uint256' }],
		name: 'isValidEpoch',
		outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'name',
		outputs: [{ internalType: 'string', name: '', type: 'string' }],
		stateMutability: 'pure',
		type: 'function'
	},
	{
		inputs: [{ internalType: 'address', name: '_newAdmin', type: 'address' }],
		name: 'proposeAdmin',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{
		inputs: [
			{ internalType: 'uint256', name: '_lsETHAmount', type: 'uint256' },
			{ internalType: 'address', name: '_recipient', type: 'address' }
		],
		name: 'requestRedeem',
		outputs: [
			{
				internalType: 'uint32',
				name: '_redeemRequestId',
				type: 'uint32'
			}
		],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{
		inputs: [
			{
				internalType: 'uint32[]',
				name: '_redeemRequestIds',
				type: 'uint32[]'
			}
		],
		name: 'resolveRedeemRequests',
		outputs: [
			{
				internalType: 'int64[]',
				name: 'withdrawalEventIds',
				type: 'int64[]'
			}
		],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'sendCLFunds',
		outputs: [],
		stateMutability: 'payable',
		type: 'function'
	},
	{
		inputs: [],
		name: 'sendCoverageFunds',
		outputs: [],
		stateMutability: 'payable',
		type: 'function'
	},
	{
		inputs: [],
		name: 'sendELFees',
		outputs: [],
		stateMutability: 'payable',
		type: 'function'
	},
	{
		inputs: [],
		name: 'sendRedeemManagerExceedingFunds',
		outputs: [],
		stateMutability: 'payable',
		type: 'function'
	},
	{
		inputs: [{ internalType: 'address', name: '_newAllowlist', type: 'address' }],
		name: 'setAllowlist',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{
		inputs: [
			{
				components: [
					{
						internalType: 'uint64',
						name: 'epochsPerFrame',
						type: 'uint64'
					},
					{
						internalType: 'uint64',
						name: 'slotsPerEpoch',
						type: 'uint64'
					},
					{
						internalType: 'uint64',
						name: 'secondsPerSlot',
						type: 'uint64'
					},
					{
						internalType: 'uint64',
						name: 'genesisTime',
						type: 'uint64'
					},
					{
						internalType: 'uint64',
						name: 'epochsToAssumedFinality',
						type: 'uint64'
					}
				],
				internalType: 'struct CLSpec.CLSpecStruct',
				name: '_newValue',
				type: 'tuple'
			}
		],
		name: 'setCLSpec',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{
		inputs: [{ internalType: 'address', name: '_newCollector', type: 'address' }],
		name: 'setCollector',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{
		inputs: [
			{
				components: [
					{ internalType: 'uint256', name: 'epoch', type: 'uint256' },
					{
						internalType: 'uint256',
						name: 'validatorsBalance',
						type: 'uint256'
					},
					{
						internalType: 'uint256',
						name: 'validatorsSkimmedBalance',
						type: 'uint256'
					},
					{
						internalType: 'uint256',
						name: 'validatorsExitedBalance',
						type: 'uint256'
					},
					{
						internalType: 'uint256',
						name: 'validatorsExitingBalance',
						type: 'uint256'
					},
					{
						internalType: 'uint32',
						name: 'validatorsCount',
						type: 'uint32'
					},
					{
						internalType: 'uint32[]',
						name: 'stoppedValidatorCountPerOperator',
						type: 'uint32[]'
					},
					{
						internalType: 'bool',
						name: 'rebalanceDepositToRedeemMode',
						type: 'bool'
					},
					{
						internalType: 'bool',
						name: 'slashingContainmentMode',
						type: 'bool'
					}
				],
				internalType: 'struct IOracleManagerV1.ConsensusLayerReport',
				name: '_report',
				type: 'tuple'
			}
		],
		name: 'setConsensusLayerData',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{
		inputs: [
			{
				internalType: 'address',
				name: '_newCoverageFund',
				type: 'address'
			}
		],
		name: 'setCoverageFund',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{
		inputs: [
			{
				components: [
					{
						internalType: 'uint128',
						name: 'minDailyNetCommittableAmount',
						type: 'uint128'
					},
					{
						internalType: 'uint128',
						name: 'maxDailyRelativeCommittableAmount',
						type: 'uint128'
					}
				],
				internalType: 'struct DailyCommittableLimits.DailyCommittableLimitsStruct',
				name: '_dcl',
				type: 'tuple'
			}
		],
		name: 'setDailyCommittableLimits',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{
		inputs: [
			{
				internalType: 'address',
				name: '_newELFeeRecipient',
				type: 'address'
			}
		],
		name: 'setELFeeRecipient',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{
		inputs: [{ internalType: 'uint256', name: '_newFee', type: 'uint256' }],
		name: 'setGlobalFee',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{
		inputs: [{ internalType: 'string', name: '_metadataURI', type: 'string' }],
		name: 'setMetadataURI',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{
		inputs: [
			{
				internalType: 'address',
				name: '_oracleAddress',
				type: 'address'
			}
		],
		name: 'setOracle',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{
		inputs: [
			{
				components: [
					{
						internalType: 'uint256',
						name: 'annualAprUpperBound',
						type: 'uint256'
					},
					{
						internalType: 'uint256',
						name: 'relativeLowerBound',
						type: 'uint256'
					}
				],
				internalType: 'struct ReportBounds.ReportBoundsStruct',
				name: '_newValue',
				type: 'tuple'
			}
		],
		name: 'setReportBounds',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{
		inputs: [
			{
				internalType: 'uint256',
				name: '_underlyingAssetAmount',
				type: 'uint256'
			}
		],
		name: 'sharesFromUnderlyingBalance',
		outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'symbol',
		outputs: [{ internalType: 'string', name: '', type: 'string' }],
		stateMutability: 'pure',
		type: 'function'
	},
	{
		inputs: [],
		name: 'totalSupply',
		outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'totalUnderlyingSupply',
		outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [
			{ internalType: 'address', name: '_to', type: 'address' },
			{ internalType: 'uint256', name: '_value', type: 'uint256' }
		],
		name: 'transfer',
		outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{
		inputs: [
			{ internalType: 'address', name: '_from', type: 'address' },
			{ internalType: 'address', name: '_to', type: 'address' },
			{ internalType: 'uint256', name: '_value', type: 'uint256' }
		],
		name: 'transferFrom',
		outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{
		inputs: [{ internalType: 'uint256', name: '_shares', type: 'uint256' }],
		name: 'underlyingBalanceFromShares',
		outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function'
	},
	{ stateMutability: 'payable', type: 'receive' }
]
