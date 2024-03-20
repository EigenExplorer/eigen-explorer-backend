import prisma from '../../prisma/prismaClient.js';

async function getTotalNumOfAVS(req, res) {
    try {
        const totalNumOfAVS = await prisma.avs.count();
        res.send({ totalNumOfAVS });
    } catch (error) {
        // Handle any potential errors that might occur during the fetch operation
        console.error('Failed to fetch total number of AVS:', error);
        res.status(500).send('An error occurred while fetching data.');
    }
}

export { getTotalNumOfAVS };
