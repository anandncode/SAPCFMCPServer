#!/bin/bash

# SAP CF MCP Helper Script for VS Code
# This script provides easy access to MCP server functionality

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE} SAP BTP Cloud Foundry MCP Tools${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

build_project() {
    echo -e "${YELLOW}🔨 Building MCP Server...${NC}"
    npm run build
    echo -e "${GREEN}✅ Build completed${NC}"
}

find_mta_files() {
    echo -e "${YELLOW}🔍 Finding MTA files...${NC}"
    find . -name "mta.yaml" -o -name "mta.yml" | grep -v node_modules | head -10
}

parse_mta() {
    local file="$1"
    if [[ -z "$file" ]]; then
        echo -e "${RED}❌ Please provide MTA file path${NC}"
        return 1
    fi

    if [[ ! -f "$file" ]]; then
        echo -e "${RED}❌ File not found: $file${NC}"
        return 1
    fi

    echo -e "${YELLOW}📋 Parsing MTA file: $file${NC}"
    node scripts/mcp-cli.js parse "$file"
}

start_server() {
    echo -e "${YELLOW}🚀 Starting MCP Server...${NC}"
    echo -e "${BLUE}Press Ctrl+C to stop${NC}"
    npm start
}

interactive_menu() {
    print_header
    echo
    echo "Choose an option:"
    echo "1. List MTA files in workspace"
    echo "2. Parse MTA file"
    echo "3. Start MCP Server"
    echo "4. Build project"
    echo "5. Exit"
    echo
    read -p "Enter your choice (1-5): " choice

    case $choice in
        1)
            find_mta_files
            echo
            read -p "Press Enter to continue..."
            interactive_menu
            ;;
        2)
            echo
            find_mta_files
            echo
            read -p "Enter MTA file path: " mta_file
            parse_mta "$mta_file"
            echo
            read -p "Press Enter to continue..."
            interactive_menu
            ;;
        3)
            start_server
            ;;
        4)
            build_project
            echo
            read -p "Press Enter to continue..."
            interactive_menu
            ;;
        5)
            echo -e "${GREEN}👋 Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Invalid choice${NC}"
            interactive_menu
            ;;
    esac
}

show_help() {
    print_header
    echo
    echo "Usage: $0 [command] [options]"
    echo
    echo "Commands:"
    echo "  build               Build the MCP server"
    echo "  list               List MTA files in workspace"
    echo "  parse <file>       Parse specific MTA file"
    echo "  server             Start MCP server"
    echo "  menu               Show interactive menu"
    echo "  help               Show this help"
    echo
    echo "Examples:"
    echo "  $0 list"
    echo "  $0 parse ./mta.yaml"
    echo "  $0 server"
    echo "  $0 menu"
    echo
    echo "VS Code Integration:"
    echo "  - Use Command Palette: 'Tasks: Run Task'"
    echo "  - Select 'Parse MTA File' or 'Start MCP Server'"
    echo "  - Or run this script from integrated terminal"
}

# Main script logic
case "${1:-menu}" in
    build)
        print_header
        build_project
        ;;
    list)
        print_header
        find_mta_files
        ;;
    parse)
        print_header
        parse_mta "$2"
        ;;
    server)
        print_header
        start_server
        ;;
    menu)
        interactive_menu
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}❌ Unknown command: $1${NC}"
        show_help
        exit 1
        ;;
esac