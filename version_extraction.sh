#!/bin/bash

# Travel Email Parser - Complete Version Extraction Script
# This script extracts version information for all tools and dependencies

echo "🔍 TRAVEL EMAIL PARSER - COMPLETE TOOL VERSION INVENTORY"
echo "========================================================="
echo "Generated on: $(date)"
echo ""

# System Information
echo "💻 SYSTEM INFORMATION"
echo "---------------------"
echo "OS: $(uname -s) $(uname -r)"
echo "Architecture: $(uname -m)"
echo "Hostname: $(hostname)"
echo ""

# Core Development Tools
echo "🛠️  CORE DEVELOPMENT TOOLS"
echo "---------------------------"

# Node.js and npm
if command -v node &> /dev/null; then
    echo "Node.js: $(node --version)"
else
    echo "Node.js: Not installed"
fi

if command -v npm &> /dev/null; then
    echo "npm: $(npm --version)"
else
    echo "npm: Not installed"
fi

# Git
if command -v git &> /dev/null; then
    echo "Git: $(git --version | cut -d' ' -f3)"
else
    echo "Git: Not installed"
fi

echo ""

# Docker Tools
echo "🐳 CONTAINERIZATION"
echo "-------------------"

if command -v docker &> /dev/null; then
    echo "Docker: $(docker --version | cut -d' ' -f3 | tr -d ',')"
else
    echo "Docker: Not installed"
fi

if command -v docker-compose &> /dev/null; then
    echo "Docker Compose: $(docker-compose --version | cut -d' ' -f3 | tr -d ',')"
else
    echo "Docker Compose: Not installed"
fi

echo ""

# Database Tools
echo "🗄️  DATABASE TOOLS"
echo "------------------"

# PostgreSQL client
if command -v psql &> /dev/null; then
    echo "PostgreSQL Client: $(psql --version | cut -d' ' -f3)"
else
    echo "PostgreSQL Client: Not installed"
fi

# pg_dump
if command -v pg_dump &> /dev/null; then
    echo "pg_dump: $(pg_dump --version | cut -d' ' -f3)"
else
    echo "pg_dump: Not installed"
fi

echo ""

# Prisma Tools
echo "🔄 PRISMA ORM TOOLS"
echo "-------------------"

if command -v npx &> /dev/null; then
    # Check if we're in a project directory with Prisma
    if [ -f "package.json" ]; then
        if grep -q "prisma" package.json; then
            echo "Prisma CLI: $(npx prisma --version | head -1 | awk '{print $2}')"
        else
            echo "Prisma CLI: Not in project dependencies"
        fi
    else
        echo "Prisma CLI: No package.json found"
    fi
else
    echo "npx: Not available"
fi

echo ""

# Project Dependencies
echo "📦 PROJECT DEPENDENCIES"
echo "-----------------------"

if [ -f "package.json" ]; then
    echo "Reading from package.json..."
    
    # Production Dependencies
    echo ""
    echo "🔗 PRODUCTION DEPENDENCIES:"
    if command -v jq &> /dev/null; then
        jq -r '.dependencies | to_entries[] | "\(.key): \(.value)"' package.json | sort
    else
        echo "jq not available - showing raw dependencies section:"
        grep -A 50 '"dependencies"' package.json | grep -E '^\s*"[^"]+"\s*:\s*"[^"]+"\s*,?\s*$' | sed 's/[",]//g' | sed 's/^\s*//' | sort
    fi
    
    # Development Dependencies
    echo ""
    echo "🔧 DEVELOPMENT DEPENDENCIES:"
    if command -v jq &> /dev/null; then
        jq -r '.devDependencies | to_entries[]? | "\(.key): \(.value)"' package.json | sort
    else
        echo "jq not available - showing raw devDependencies section:"
        grep -A 50 '"devDependencies"' package.json | grep -E '^\s*"[^"]+"\s*:\s*"[^"]+"\s*,?\s*$' | sed 's/[",]//g' | sed 's/^\s*//' | sort
    fi
    
    # Scripts
    echo ""
    echo "📝 AVAILABLE SCRIPTS:"
    if command -v jq &> /dev/null; then
        jq -r '.scripts | to_entries[]? | "\(.key): \(.value)"' package.json
    else
        echo "jq not available - showing raw scripts section:"
        grep -A 20 '"scripts"' package.json | grep -E '^\s*"[^"]+"\s*:\s*"[^"]+"\s*,?\s*$' | sed 's/[",]//g' | sed 's/^\s*//'
    fi
    
else
    echo "❌ package.json not found in current directory"
fi

echo ""

# Actually Installed Versions
echo "✅ ACTUALLY INSTALLED VERSIONS"
echo "------------------------------"

if [ -f "package.json" ] && [ -d "node_modules" ]; then
    echo "Checking installed versions in node_modules..."
    
    # Key dependencies to check
    key_deps=("express" "prisma" "@prisma/client" "dotenv" "cors" "helmet" "bcryptjs" "jsonwebtoken" "joi" "winston" "jest" "supertest")
    
    for dep in "${key_deps[@]}"; do
        if [ -f "node_modules/$dep/package.json" ]; then
            if command -v jq &> /dev/null; then
                version=$(jq -r '.version' "node_modules/$dep/package.json")
                echo "$dep: $version"
            else
                version=$(grep '"version"' "node_modules/$dep/package.json" | cut -d'"' -f4)
                echo "$dep: $version"
            fi
        fi
    done
else
    echo "❌ node_modules not found - run 'npm install' first"
fi

echo ""

# Database Schema Version
echo "🗃️  DATABASE SCHEMA"
echo "------------------"

if [ -f "prisma/schema.prisma" ]; then
    echo "Prisma Schema File: Found"
    if grep -q "generator client" prisma/schema.prisma; then
        generator_version=$(grep -A 5 "generator client" prisma/schema.prisma | grep "provider" | cut -d'"' -f4)
        echo "Prisma Generator: $generator_version"
    fi
    if grep -q "datasource db" prisma/schema.prisma; then
        datasource=$(grep -A 5 "datasource db" prisma/schema.prisma | grep "provider" | cut -d'"' -f4)
        echo "Database Provider: $datasource"
    fi
    
    # Count migrations
    if [ -d "prisma/migrations" ]; then
        migration_count=$(ls -1 prisma/migrations | grep -v migration_lock.toml | wc -l)
        echo "Migration Count: $migration_count"
        echo "Latest Migration: $(ls -1t prisma/migrations | grep -v migration_lock.toml | head -1)"
    fi
else
    echo "❌ prisma/schema.prisma not found"
fi

echo ""

# Environment Information
echo "🌍 ENVIRONMENT CONFIGURATION"
echo "----------------------------"

if [ -f ".env.example" ]; then
    echo "Environment Template: .env.example found"
    echo "Required Environment Variables:"
    grep -E "^[A-Z_]+" .env.example | cut -d'=' -f1 | sort
else
    echo "❌ .env.example not found"
fi

echo ""

# Docker Configuration
echo "🐳 DOCKER CONFIGURATION"
echo "-----------------------"

if [ -f "Dockerfile" ]; then
    echo "Dockerfile: Found"
    if grep -q "FROM" Dockerfile; then
        base_image=$(grep "FROM" Dockerfile | head -1 | cut -d' ' -f2)
        echo "Base Image: $base_image"
    fi
fi

if [ -f "docker-compose.yml" ]; then
    echo "Docker Compose: docker-compose.yml found"
fi

if [ -f "docker-compose.dev.yml" ]; then
    echo "Development Compose: docker-compose.dev.yml found"
fi

echo ""

# CI/CD Information
echo "🚀 CI/CD CONFIGURATION"
echo "----------------------"

if [ -f ".github/workflows/ci.yml" ]; then
    echo "GitHub Actions: ci.yml found"
    if grep -q "node-version" .github/workflows/ci.yml; then
        node_versions=$(grep "node-version" .github/workflows/ci.yml | cut -d':' -f2 | tr -d ' []"')
        echo "CI Node Versions: $node_versions"
    fi
fi

echo ""

# Additional Tools
echo "🔧 ADDITIONAL DEVELOPMENT TOOLS"
echo "-------------------------------"

# Check for commonly used tools
tools=("curl" "wget" "jq" "tree" "code" "brew" "yarn")

for tool in "${tools[@]}"; do
    if command -v $tool &> /dev/null; then
        case $tool in
            "code")
                echo "VS Code: $(code --version | head -1)"
                ;;
            "brew")
                echo "Homebrew: $(brew --version | head -1)"
                ;;
            "jq")
                echo "jq: $(jq --version)"
                ;;
            *)
                version_output=$($tool --version 2>/dev/null | head -1)
                if [ $? -eq 0 ]; then
                    echo "$tool: $version_output"
                else
                    echo "$tool: Available (version check failed)"
                fi
                ;;
        esac
    fi
done

echo ""
echo "📊 EXTRACTION COMPLETE"
echo "====================="
echo "Script completed at: $(date)"
echo ""
echo "💡 To save this output to a file, run:"
echo "   ./version_extraction.sh > tools_inventory.txt"