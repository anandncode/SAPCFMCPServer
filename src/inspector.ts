#!/usr/bin/env node

/**
 * Simple inspector to test the MCP server manually
 * Run this after building the project to test functionality
 */

console.log('SAP CF MCP Server Inspector');
console.log('===========================');
console.log('');
console.log('To test the MCP server:');
console.log('1. Build the project: npm run build');
console.log('2. Start the server: npm start');
console.log('3. In another terminal, test with MCP client tools or');
console.log('4. Use this as a template for your own client implementation');
console.log('');
console.log('Available tools:');
console.log('- parse_mta: Parse MTA descriptor files');
console.log('- get_access_token: Get XSUAA access tokens');
console.log('- get_cf_resources: Query Cloud Foundry APIs');
console.log('');
console.log('Example MTA file location: ./examples/sample-mta.yaml');
console.log('Example credentials: ./examples/sample-credentials.json');
console.log('');
console.log('For Claude Desktop integration, see: ./examples/claude-desktop-config.json');