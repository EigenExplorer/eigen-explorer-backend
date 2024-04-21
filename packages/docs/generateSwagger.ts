import swaggerJSDoc from 'swagger-jsdoc';
import * as fs from 'node:fs';

const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'Eigen Explorer node / server backend',
        version: '1.0.0',
        description: 'Eigen Explorer node / server backend API documentation',
        license: {
            name: 'MIT',
            url: 'https://spdx.org/licenses/MIT.html',
        },
    },
    servers: [
        {
            url: 'https://api.eigenexplorer.com',
            description: 'Eigen Explorer Ethereum Mainnet API server',
        },
    ],
};

const options = {
    apis: ['../api/src/routes/**/*.ts', './swaggerComponents.ts'],
    swaggerDefinition,
};

const swaggerSpec = swaggerJSDoc(options);

fs.writeFileSync('./openapi.json', JSON.stringify(swaggerSpec));
console.log('Swagger doc generated and saved as openapi.json');
