# Eigen Explorer Backend API Documentation

Currently all API documentation is housed in the separate [API documentation](https://github.com/Eigen-Explorer/eigen-explorer-docs) repository. The scripts in this folder generates the openapi.json file which is then consumed by the API documentation repository to generate the API documentation.

## Generating the openapi.json file

Run

```bash
npm run generate-docs
```

This will geneate the openapi.json in the `./docs` folder. This file is then copied to the API documentation repository to generate the API documentation.
