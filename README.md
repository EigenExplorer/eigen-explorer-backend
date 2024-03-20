# Eigen Explorer Backend

## Run Locally

```bash
# Install dependencies
npm install

# Start the server
npm start
```

## Project Structure

```bash
eigen-explorer-backend/
│
├── src/
│ ├── api/ # API-specific route handlers
│ │ ├── avs/ # AVS API routes and controllers
│ │ │ ├── avsRoutes.js
│ │ │ └── avsController.js
│ │ │
│ │ ├── strategies/ # LST & Eigen Pod Strategy API routes and controllers
│ │ │ ├── avsRoutes.js
│ │ │ └── avsController.js
│ │ │
│ │ └── index.js # Aggregate API routes
│ │
│ ├── prisma/ # Prisma database models and client
│ │ ├── prismaClient.js
│ │ └── schema.prisma
│ │
│ ├── data/ # Smart contract ABIs and addresses
│ │ ├── abi/
│ │ └── address/
│ │
│ ├── app.js # Express app setup, middleware registration
│ └── server.js # Server entry point, connects app with HTTP server
│
├── package.json
└── .env # Environment variables
```
