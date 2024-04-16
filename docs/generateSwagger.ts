import swaggerJSDoc from 'swagger-jsdoc';
import * as fs from 'fs';

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
            description: 'Eigen Explorer API server',
        },
    ],
};

const options = {
    apis: ['./src/api/**/*.ts', './docs/swaggerComponents.ts'],
    swaggerDefinition,
};

const swaggerSpec = swaggerJSDoc(options);

fs.writeFileSync('./docs/openapi.json', JSON.stringify(swaggerSpec));
console.log('Swagger doc generated and saved as openapi.json');
