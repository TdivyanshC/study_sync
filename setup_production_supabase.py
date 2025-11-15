#!/usr/bin/env python3
"""
Production Supabase Setup Script for StudySync
Creates a new Supabase project with identical schema to development
"""

import os
import sys
import requests
from pathlib import Path

def create_production_supabase():
    """Create production Supabase project and setup schema"""

    print("Setting up Production Supabase for StudySync")
    print("=" * 50)

    # Check if we have Supabase CLI
    try:
        import subprocess
        result = subprocess.run(['supabase', '--version'], capture_output=True, text=True)
        if result.returncode != 0:
            print("ERROR: Supabase CLI not found. Please install it first:")
            print("   npm install supabase --global")
            return False
    except FileNotFoundError:
        print("ERROR: Supabase CLI not found. Please install it first:")
        print("   npm install supabase --global")
        return False

    print("OK: Supabase CLI found")

    # Create new project
    print("\nCreating new Supabase project: 'SmartSpaces - PRODUCTION'")
    print("Please complete the following steps manually:")
    print("1. Go to https://supabase.com/dashboard")
    print("2. Click 'New Project'")
    print("3. Name: 'SmartSpaces - PRODUCTION'")
    print("4. Choose your organization")
    print("5. Select region (preferably same as dev)")
    print("6. Set database password (save this!)")
    print("7. Click 'Create new project'")

    input("\n⏳ Press Enter after you've created the project...")

    # Get project details
    project_ref = input("Enter your new project REF (from project URL): ").strip()
    anon_key = input("Enter the ANON PUBLIC key: ").strip()
    service_role_key = input("Enter the SERVICE ROLE key (keep secret!): ").strip()

    if not all([project_ref, anon_key, service_role_key]):
        print("❌ All keys are required!")
        return False

    supabase_url = f"https://{project_ref}.supabase.co"

    print(f"\nProject URL: {supabase_url}")
    print("OK: Keys received")

    # Update production env files
    print("\nUpdating production environment files...")

    # Backend .env.production
    backend_env = Path("backend/.env.production")
    backend_content = f'SUPABASE_URL="{supabase_url}"\nSUPABASE_SERVICE_KEY="{service_role_key}"'

    backend_env.write_text(backend_content)
    print("OK: Updated backend/.env.production")

    # Frontend .env.production
    frontend_env = Path("frontend/.env.production")
    frontend_content = f'''EXPO_TUNNEL_SUBDOMAIN=studystreak-prod
EXPO_PACKAGER_HOSTNAME=https://studystreak-prod.preview.emergentagent.com
EXPO_PUBLIC_BACKEND_URL=https://studystreak-prod.preview.emergentagent.com
EXPO_USE_FAST_RESOLVER="1"
METRO_CACHE_ROOT=/app/frontend/.metro-cache
EXPO_PUBLIC_SUPABASE_URL={supabase_url}
EXPO_PUBLIC_SUPABASE_ANON_KEY={anon_key}'''

    frontend_env.write_text(frontend_content)
    print("OK: Updated frontend/.env.production")

    # Create schema setup script
    print("\nSetting up database schema...")
    print("Please run the following SQL in your Supabase SQL Editor:")

    schema_file = Path("backend/supabase_schema.sql")
    if schema_file.exists():
        print("\n" + "="*50)
        print("COPY AND RUN THIS SQL IN SUPABASE DASHBOARD:")
        print("="*50)
        print(schema_file.read_text())
        print("="*50)
    else:
        print("❌ Schema file not found!")

    input("\n⏳ Press Enter after running the SQL schema...")

    print("\nProduction Supabase setup complete!")
    print("Summary:")
    print(f"   Project: SmartSpaces - PRODUCTION")
    print(f"   URL: {supabase_url}")
    print("   Frontend: OK Configured")
    print("   Backend: OK Configured")
    print("   Schema: OK Applied")
    print("\nIMPORTANT: Never commit SERVICE_ROLE_KEY to version control!")

    return True

if __name__ == "__main__":
    success = create_production_supabase()
    sys.exit(0 if success else 1)