#!/usr/bin/env node

/**
 * Script to set up all environment variables for Vercel single project deployment
 * 
 * Usage:
 *   node setup-vercel-env.js <project-name> [--dry-run]
 * 
 * Example:
 *   node setup-vercel-env.js noeliq
 *   node setup-vercel-env.js noeliq --dry-run
 */

const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Environment variables to set
const ENV_VARS = {
  // Azure OpenAI (4)
  'AZURE_OPENAI_ENDPOINT': {
    description: 'Azure OpenAI Endpoint URL',
    example: 'https://your-resource.openai.azure.com/',
    required: true
  },
  'AZURE_OPENAI_API_KEY': {
    description: 'Azure OpenAI API Key',
    example: 'your-api-key',
    required: true
  },
  'AZURE_OPENAI_DEPLOYMENT_NAME': {
    description: 'Azure OpenAI Deployment Name',
    example: 'gpt-4o',
    default: 'gpt-4o',
    required: false
  },
  'AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME': {
    description: 'Azure OpenAI Embedding Deployment Name',
    example: 'text-embedding-3-large',
    default: 'text-embedding-3-large',
    required: false
  },
  
  // Azure Search (3)
  'AZURE_SEARCH_ENDPOINT': {
    description: 'Azure Search Endpoint URL',
    example: 'https://your-search-service.search.windows.net',
    required: true
  },
  'AZURE_SEARCH_API_KEY': {
    description: 'Azure Search API Key',
    example: 'your-search-api-key',
    required: true
  },
  'AZURE_SEARCH_INDEX_NAME': {
    description: 'Azure Search Index Name',
    example: 'noeliq-products',
    default: 'noeliq-products',
    required: false
  },
  
  // Server (2)
  'PORT': {
    description: 'Server Port',
    example: '5000',
    default: '5000',
    required: false
  },
  'NODE_ENV': {
    description: 'Node Environment',
    example: 'production',
    default: 'production',
    required: false
  },
  
  // Auth (2)
  'ADMIN_TOKEN': {
    description: 'Admin Token (generate with: openssl rand -hex 32)',
    example: 'your-secure-admin-token',
    required: true
  },
  'STAFF_TOKEN': {
    description: 'Staff Token',
    example: 'staff-access',
    default: 'staff-access',
    required: false
  },
  
  // RAG (3)
  'RAG_CHUNK_LIMIT': {
    description: 'RAG Chunk Limit',
    example: '5',
    default: '5',
    required: false
  },
  'USE_OPTIMIZED_RAG': {
    description: 'Use Optimized RAG',
    example: 'false',
    default: 'false',
    required: false
  },
  'USE_TURN_ORCHESTRATOR': {
    description: 'Use Turn Orchestrator',
    example: 'true',
    default: 'true',
    required: false
  },
  
  // Frontend (1)
  'FRONTEND_URL': {
    description: 'Frontend URL (set after deployment)',
    example: 'https://your-project.vercel.app',
    required: false
  }
};

const ENVIRONMENTS = ['production', 'preview', 'development'];

async function main() {
  const args = process.argv.slice(2);
  const projectName = args[0];
  const isDryRun = args.includes('--dry-run');
  
  if (!projectName) {
    console.error('Usage: node setup-vercel-env.js <project-name> [--dry-run]');
    process.exit(1);
  }
  
  console.log(`\n🚀 Setting up environment variables for project: ${projectName}`);
  if (isDryRun) {
    console.log('⚠️  DRY RUN MODE - No variables will be set\n');
  }
  console.log('This script will set 15 environment variables for all 3 environments.\n');
  
  const values = {};
  
  // Collect values
  for (const [key, config] of Object.entries(ENV_VARS)) {
    if (config.default && !config.required) {
      const useDefault = await question(
        `${config.description} (${key})\n  Default: ${config.default}\n  Use default? (Y/n): `
      );
      values[key] = useDefault.toLowerCase() === 'n' 
        ? await question(`  Enter value: `)
        : config.default;
    } else {
      const value = await question(
        `${config.description} (${key})\n  Example: ${config.example}\n  Enter value: `
      );
      values[key] = value.trim();
    }
    console.log(`  ✓ ${key} = ${values[key]}\n`);
  }
  
  // Confirm
  console.log('\n📋 Summary of variables to set:');
  for (const [key, value] of Object.entries(values)) {
    console.log(`  ${key} = ${value}`);
  }
  
  const confirm = await question('\nProceed with setting these variables? (y/N): ');
  if (confirm.toLowerCase() !== 'y') {
    console.log('Cancelled.');
    rl.close();
    return;
  }
  
  // Set variables
  if (isDryRun) {
    console.log('\n🔍 DRY RUN - Would set variables:\n');
    for (const env of ENVIRONMENTS) {
      for (const [key, value] of Object.entries(values)) {
        console.log(`vercel env add ${key} ${env}`);
        console.log(`  (value: ${value})`);
      }
    }
  } else {
    console.log('\n⚙️  Setting variables...\n');
    for (const env of ENVIRONMENTS) {
      console.log(`Setting for ${env} environment...`);
      for (const [key, value] of Object.entries(values)) {
        try {
          // Use echo to pipe value to vercel env add
          execSync(`echo "${value}" | vercel env add ${key} ${env}`, {
            stdio: 'inherit',
            cwd: process.cwd()
          });
          console.log(`  ✓ ${key} = ${value}`);
        } catch (error) {
          console.error(`  ✗ Failed to set ${key}: ${error.message}`);
        }
      }
      console.log('');
    }
  }
  
  console.log('\n✅ Environment variables setup complete!');
  console.log('\nNext steps:');
  console.log('1. Verify in Vercel Dashboard → Settings → Environment Variables');
  console.log('2. Deploy: vercel --prod');
  console.log('3. Update FRONTEND_URL with actual deployment URL');
  
  rl.close();
}

main().catch(console.error);

