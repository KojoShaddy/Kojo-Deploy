#!/usr/bin/env node

import { execa } from 'execa';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import path from 'path';

const log = console.log;

async function banner() {
    log(chalk.cyan(`
    =========================================
       🚀 KOJO-DEPLOY ENGINE IS STARTING...
    =========================================
    `));
    log(chalk.gray(`Lightweight GCP Deployment Utility by Kojo Shaddy\n`));
}

async function checkGcloud() {
    const spinner = ora('Checking Google Cloud SDK...').start();
    try {
        await execa('gcloud', ['--version']);
        spinner.succeed(chalk.green('Google Cloud SDK found!'));
    } catch (error) {
        spinner.fail(chalk.red('Google Cloud SDK (gcloud) is not installed or not in PATH.'));
        log(chalk.yellow('Please install it from: https://cloud.google.com/sdk/docs/install'));
        process.exit(1);
    }
}

async function checkAuth() {
    const spinner = ora('Checking authentication...').start();
    try {
        const { stdout } = await execa('gcloud', ['auth', 'list', '--format=json']);
        const auths = JSON.parse(stdout);
        const activeAccount = auths.find(a => a.status === 'ACTIVE');
        
        if (!activeAccount) {
            spinner.info(chalk.yellow('No active Google Cloud session found.'));
            spinner.stop();
            log(chalk.blue('Redirecting to browser for authentication...'));
            await execa('gcloud', ['auth', 'login'], { stdio: 'inherit' });
        } else {
            spinner.succeed(chalk.green(`Authenticated as ${activeAccount.account}`));
        }
    } catch (error) {
        spinner.fail(chalk.red('Failed to check authentication.'));
        process.exit(1);
    }
}

async function openBilling(projectId) {
    const url = `https://console.cloud.google.com/billing/linkedaccount?project=${projectId}`;
    log(chalk.yellow(`\n⚠️  IMPORTANT: Cloud Run requires an active billing account.`));
    log(chalk.cyan(`Opening billing configuration in your browser...`));
    
    // Windows specific open command
    try {
        await execa('cmd', ['/c', 'start', url]);
    } catch (err) {
        log(chalk.gray(`Could not open browser automatically. Please visit:`));
        log(chalk.bold.underline(url));
    }
}

async function runEngine() {
    await banner();
    await checkGcloud();
    await checkAuth();

    // 1. Project Selection/Creation
    const { mode } = await inquirer.prompt([
        {
            type: 'list',
            name: 'mode',
            message: 'What would you like to do with the GCP Project?',
            choices: [
                { name: 'Select an existing project', value: 'select' },
                { name: 'Create a new project', value: 'create' }
            ]
        }
    ]);

    let projectId;

    if (mode === 'select') {
        const spinner = ora('Fetching projects...').start();
        try {
            const { stdout } = await execa('gcloud', ['projects', 'list', '--format=json']);
            const projects = JSON.parse(stdout);
            spinner.stop();

            if (projects.length === 0) {
                log(chalk.yellow('No projects found. You must create one.'));
                const { newId } = await inquirer.prompt([{ type: 'input', name: 'newId', message: 'Enter new Project ID:' }]);
                projectId = newId;
            } else {
                const { selectedProject } = await inquirer.prompt([
                    {
                        type: 'list',
                        name: 'selectedProject',
                        message: 'Select a project:',
                        choices: projects.map(p => ({ name: `${p.name} (${p.projectId})`, value: p.projectId }))
                    }
                ]);
                projectId = selectedProject;
            }
        } catch (error) {
            spinner.fail(chalk.red('Failed to fetch projects.'));
            const { manualId } = await inquirer.prompt([{ type: 'input', name: 'manualId', message: 'Enter Project ID manually:' }]);
            projectId = manualId;
        }
    } else {
        const { newId } = await inquirer.prompt([
            {
                type: 'input',
                name: 'newId',
                message: 'Enter a UNIQUE Project ID (e.g. my-awesome-app-123):',
                validate: input => input.length >= 6 || 'Project ID must be at least 6 characters'
            }
        ]);
        projectId = newId;
        
        const createSpinner = ora(`Creating project ${projectId}...`).start();
        try {
            await execa('gcloud', ['projects', 'create', projectId]);
            createSpinner.succeed(chalk.green(`Project ${projectId} created successfully!`));
        } catch (error) {
            createSpinner.fail(chalk.red(`Failed to create project: ${error.message}`));
            log(chalk.gray('If the project already exists, try selecting it.'));
            process.exit(1);
        }
    }

    // Set project
    const projectSpinner = ora(`Setting active project to ${projectId}...`).start();
    try {
        await execa('gcloud', ['config', 'set', 'project', projectId]);
        projectSpinner.succeed(chalk.green(`Active project set to ${projectId}`));
    } catch (error) {
        projectSpinner.fail(chalk.red(`Failed to set project: ${error.message}`));
        process.exit(1);
    }

    // 2. Billing Check (Opening URL)
    await openBilling(projectId);
    
    const { billingDone } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'billingDone',
            message: 'Have you verified that billing is enabled for this project?',
            default: true
        }
    ]);

    if (!billingDone) {
        log(chalk.yellow('Please enable billing and run Kojo-Deploy again.'));
        process.exit(0);
    }

    // Enable necessary services
    const apiSpinner = ora('Enabling Cloud Run and Cloud Build APIs...').start();
    try {
        await execa('gcloud', ['services', 'enable', 'run.googleapis.com', 'cloudbuild.googleapis.com']);
        apiSpinner.succeed(chalk.green('Required APIs enabled!'));
    } catch (error) {
        apiSpinner.fail(chalk.red(`Failed to enable APIs: ${error.message}`));
        log(chalk.gray('This might happen if billing is not yet linked.'));
        process.exit(1);
    }

    // 3. Service Configuration
    const { serviceName, region } = await inquirer.prompt([
        {
            type: 'input',
            name: 'serviceName',
            message: 'Enter your Cloud Run Service Name:',
            default: path.basename(process.cwd()).toLowerCase().replace(/[^a-z0-9]/g, '-')
        },
        {
            type: 'list',
            name: 'region',
            message: 'Select deployment region:',
            choices: ['us-central1', 'europe-west1', 'asia-east1', 'us-east1'],
            default: 'us-central1'
        }
    ]);

    // Check for Dockerfile
    if (!fs.existsSync('Dockerfile')) {
        log(chalk.yellow('\nNo Dockerfile found in current directory.'));
        const { createDockerfile } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'createDockerfile',
                message: 'Would you like Kojo-Deploy to generate a basic Node.js Dockerfile for you?',
                default: true
            }
        ]);

        if (createDockerfile) {
            const dockerfileContent = `FROM node:18-slim
WORKDIR /usr/src/app
COPY package*.json ./
COPY . .
RUN npm install --production
EXPOSE 8080
CMD ["npm", "start"]
`;
            fs.writeFileSync('Dockerfile', dockerfileContent);
            log(chalk.green('✔ Dockerfile generated!'));
        } else {
            log(chalk.red('Cannot proceed without a Dockerfile.'));
            process.exit(1);
        }
    }

    // 4. Deployment
    log(chalk.cyan(`\nStarting deployment for ${serviceName}...`));
    log(chalk.gray(`Note: Initial builds may take 2-5 minutes depending on dependencies.`));
    
    try {
        const buildSpinner = ora('Submitting build to Cloud Build...').start();
        const imageTag = `gcr.io/${projectId}/${serviceName}`;
        
        // Run build and capture stdout to show log link
        const buildProcess = execa('gcloud', ['builds', 'submit', '--tag', imageTag]);
        
        // Scrape for the logs URL which usually appears early
        buildProcess.stdout.on('data', (data) => {
            const line = data.toString();
            if (line.includes('https://console.cloud.google.com/cloud-build/builds/')) {
                const url = line.match(/https:\/\/[^\s]+/)[0];
                buildSpinner.info(chalk.blue(`You can track the build progress at: ${chalk.underline(url)}`));
                buildSpinner.start('Submitting build to Cloud Build...'); // Restart spinner
            }
        });

        await buildProcess;
        buildSpinner.succeed(chalk.green('Build successful! Image pushed to GCR.'));

        const deploySpinner = ora('Deploying to Cloud Run...').start();
        const { stdout } = await execa('gcloud', [
            'run', 'deploy', serviceName,
            '--image', imageTag,
            '--platform', 'managed',
            '--region', region,
            '--allow-unauthenticated',
            '--format=json'
        ]);
        
        const deployInfo = JSON.parse(stdout);
        deploySpinner.succeed(chalk.green('Deployment successful! 🎉'));
        
        log(chalk.cyan('\n-----------------------------------------'));
        log(chalk.white(`Service URL: ${chalk.bold.underline(deployInfo.status.url)}`));
        log(chalk.cyan('-----------------------------------------\n'));
        
    } catch (error) {
        log(chalk.red(`\nDeployment failed: ${error.message}`));
        process.exit(1);
    }
}

runEngine().catch(err => {
    console.error(err);
    process.exit(1);
});
