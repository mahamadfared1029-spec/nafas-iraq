import os
import subprocess
import sys

def main():
    env = os.environ.copy()
    env['DEPLOY_TARGET'] = 'gh-pages'
    
    print("Building Next.js application for GitHub Pages (output: export, basePath: /nafas-iraq)...")
    res = subprocess.run(['npm.cmd', 'run', 'build'], env=env, cwd=os.path.dirname(os.path.abspath(__file__)))
    if res.returncode != 0:
        print("Build failed with returncode:", res.returncode)
        sys.exit(res.returncode)
    print("Build succeeded!")

if __name__ == '__main__':
    main()
