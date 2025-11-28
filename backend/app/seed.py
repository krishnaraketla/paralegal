"""
Seed default data for MVP
"""
from datetime import datetime

from app.database import (
    get_users_collection,
    get_organizations_collection,
    get_memberships_collection,
)

# Default user and organization for MVP
DEFAULT_USER_EMAIL = "default@paralegal.local"
DEFAULT_USER_NAME = "Default User"
DEFAULT_ORG_NAME = "Default Organization"


async def seed_default_data():
    """
    Create default user and organization if they don't exist.
    Returns the default user ID and organization ID.
    """
    users = get_users_collection()
    orgs = get_organizations_collection()
    memberships = get_memberships_collection()
    
    now = datetime.utcnow()
    
    # Check if default user exists
    default_user = await users.find_one({"email": DEFAULT_USER_EMAIL})
    
    if not default_user:
        # Create default user
        result = await users.insert_one({
            "email": DEFAULT_USER_EMAIL,
            "name": DEFAULT_USER_NAME,
            "created_at": now,
        })
        user_id = str(result.inserted_id)
        print(f"Created default user: {DEFAULT_USER_NAME} ({user_id})")
    else:
        user_id = str(default_user["_id"])
        print(f"Default user already exists: {user_id}")
    
    # Check if default organization exists
    default_org = await orgs.find_one({"name": DEFAULT_ORG_NAME, "created_by": user_id})
    
    if not default_org:
        # Create default organization
        result = await orgs.insert_one({
            "name": DEFAULT_ORG_NAME,
            "created_by": user_id,
            "created_at": now,
        })
        org_id = str(result.inserted_id)
        print(f"Created default organization: {DEFAULT_ORG_NAME} ({org_id})")
        
        # Add default user as member
        await memberships.insert_one({
            "user_id": user_id,
            "organization_id": org_id,
            "joined_at": now,
        })
        print(f"Added default user to default organization")
    else:
        org_id = str(default_org["_id"])
        print(f"Default organization already exists: {org_id}")
    
    return user_id, org_id


async def get_default_user_id() -> str:
    """Get the default user ID"""
    users = get_users_collection()
    default_user = await users.find_one({"email": DEFAULT_USER_EMAIL})
    if default_user:
        return str(default_user["_id"])
    raise RuntimeError("Default user not found. Run seed_default_data() first.")


async def get_default_org_id() -> str:
    """Get the default organization ID"""
    orgs = get_organizations_collection()
    default_org = await orgs.find_one({"name": DEFAULT_ORG_NAME})
    if default_org:
        return str(default_org["_id"])
    raise RuntimeError("Default organization not found. Run seed_default_data() first.")

