# Xian Explorer

Blockchain and transaction explorer for Xian. Supports JSON transactions and UTF-8.
Based on Cosmos Explorer.

## What is different from Cosmos Explorer?

Xian Explorer relies only on REST RPC (no LCD).

Also it has few extra features comparing to Cosmos Explorer.

## Requirements

Xian Explorer is stateless and relies on a high-throughput Tendermint full node to connect to. 
Explorer requires Tendermint RPC endpoints to be available publicly through TLS-secured subdomains. 

## Build

```sh
# Install dependencies
npm install

# Serve with hot reload at localhost:8080
npm run serve
```

## Deploy

```sh
# Build for production with minification
export NODE_OPTIONS=--openssl-legacy-provider
npm run build

# Then serve the `./dist` folder with the web server of your choice
```
