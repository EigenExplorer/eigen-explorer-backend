import prisma from './prismaClient'

async function seedAvs() {
  const omniAvs = await prisma.avs.upsert({
    where: { address: '0xd4a7e1bd8015057293f0d0a557088c286942e84b' },
    update: {},
    create: {
      address: '0xd4a7e1bd8015057293f0d0a557088c286942e84b',
      metadata: {
        name: 'EigenDA',
        description: 'EigenDA is a data availability solution with 10 MiB/s of write throughput and the lowest cost in its class. The system\'s design is inspired by Danksharding, which promises to scale Ethereum\'s DA beyond EIP-4844. EigenDA is available today. Learn more at https://docs.eigenlayer.xyz/eigenda/overview/',
        discord: '',
        logo: 'https://holesky-operator-metadata.s3.amazonaws.com/markEigenDA.png',
        telegram: '',
        website: 'hthttps://docs.eigenlayer.xyz/eigenda/overview',
        x: 'https://twitter.com/eigen_da'
      },
      tags: []
    },
  })

  console.log('Seeded AVS', [omniAvs])
}

async function main() {
	await seedAvs()
}

main()
	.then(async () => {
		await prisma.$disconnect()
	})
	.catch(async (e) => {
		console.error(e)
		await prisma.$disconnect()
		process.exit(1)
	})
