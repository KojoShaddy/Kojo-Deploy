import fs from 'fs';
import path from 'path';

async function setup() {
    // INIT_CWD is the directory where the user ran 'npm install'
    const projectRoot = process.env.INIT_CWD;

    if (!projectRoot) {
        return;
    }

    const packageJsonPath = path.join(projectRoot, 'package.json');

    if (fs.existsSync(packageJsonPath)) {
        try {
            const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            
            // Avoid modifying our own package.json if we are the one being installed
            if (pkg.name === '@kojo_shaddy/kojo-deploy') {
                return;
            }

            pkg.scripts = pkg.scripts || {};
            
            let updated = false;
            if (!pkg.scripts['kojo-deploy']) {
                pkg.scripts['kojo-deploy'] = 'kojo-deploy';
                updated = true;
            }

            if (updated) {
                fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2));
                console.log('\x1b[36m%s\x1b[0m', '🚀 Kojo-Deploy: Added "kojo-deploy" script to your package.json!');
            }
        } catch (err) {
            console.error('Kojo-Deploy: Failed to update package.json scripts auto-magically.');
        }
    }
}

setup();
