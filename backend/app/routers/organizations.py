"""
Organizations router - CRUD and membership management
"""
from datetime import datetime
from typing import List
from bson import ObjectId
from fastapi import APIRouter, HTTPException

from app.database import (
    get_organizations_collection,
    get_memberships_collection,
    get_users_collection,
)
from app.models.organization import OrganizationCreate, OrganizationResponse
from app.models.membership import MembershipResponse
from app.models.user import UserResponse

router = APIRouter()


@router.post("", response_model=OrganizationResponse)
async def create_organization(org: OrganizationCreate, created_by: str):
    """Create a new organization and add creator as member"""
    orgs = get_organizations_collection()
    memberships = get_memberships_collection()
    users = get_users_collection()
    
    # Verify user exists
    try:
        user = await users.find_one({"_id": ObjectId(created_by)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    now = datetime.utcnow()
    
    org_doc = {
        "name": org.name,
        "created_by": created_by,
        "created_at": now,
    }
    
    result = await orgs.insert_one(org_doc)
    org_id = str(result.inserted_id)
    
    # Automatically add creator as member
    membership_doc = {
        "user_id": created_by,
        "organization_id": org_id,
        "joined_at": now,
    }
    await memberships.insert_one(membership_doc)
    
    return OrganizationResponse(
        id=org_id,
        name=org_doc["name"],
        created_by=org_doc["created_by"],
        created_at=org_doc["created_at"],
    )


@router.get("", response_model=List[OrganizationResponse])
async def list_organizations():
    """List all organizations"""
    orgs = get_organizations_collection()
    
    result = []
    async for org in orgs.find():
        result.append(OrganizationResponse(
            id=str(org["_id"]),
            name=org["name"],
            created_by=org["created_by"],
            created_at=org["created_at"],
        ))
    
    return result


@router.get("/{org_id}", response_model=OrganizationResponse)
async def get_organization(org_id: str):
    """Get an organization by ID"""
    orgs = get_organizations_collection()
    
    try:
        org = await orgs.find_one({"_id": ObjectId(org_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid organization ID")
    
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    return OrganizationResponse(
        id=str(org["_id"]),
        name=org["name"],
        created_by=org["created_by"],
        created_at=org["created_at"],
    )


@router.delete("/{org_id}")
async def delete_organization(org_id: str):
    """Delete an organization and all its memberships"""
    orgs = get_organizations_collection()
    memberships = get_memberships_collection()
    
    try:
        result = await orgs.delete_one({"_id": ObjectId(org_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid organization ID")
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # Delete all memberships for this org
    await memberships.delete_many({"organization_id": org_id})
    
    return {"message": "Organization deleted successfully"}


# Membership management

@router.post("/{org_id}/members", response_model=MembershipResponse)
async def add_member(org_id: str, user_id: str):
    """Add a user to an organization"""
    orgs = get_organizations_collection()
    users = get_users_collection()
    memberships = get_memberships_collection()
    
    # Verify org exists
    try:
        org = await orgs.find_one({"_id": ObjectId(org_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid organization ID")
    
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # Verify user exists
    try:
        user = await users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if already a member
    existing = await memberships.find_one({
        "user_id": user_id,
        "organization_id": org_id,
    })
    if existing:
        raise HTTPException(status_code=400, detail="User is already a member")
    
    membership_doc = {
        "user_id": user_id,
        "organization_id": org_id,
        "joined_at": datetime.utcnow(),
    }
    
    result = await memberships.insert_one(membership_doc)
    
    return MembershipResponse(
        id=str(result.inserted_id),
        user_id=user_id,
        organization_id=org_id,
        joined_at=membership_doc["joined_at"],
    )


@router.get("/{org_id}/members", response_model=List[UserResponse])
async def list_members(org_id: str):
    """List all members of an organization"""
    memberships = get_memberships_collection()
    users = get_users_collection()
    
    # Verify org exists
    orgs = get_organizations_collection()
    try:
        org = await orgs.find_one({"_id": ObjectId(org_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid organization ID")
    
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # Get all user IDs for this org
    user_ids = []
    async for membership in memberships.find({"organization_id": org_id}):
        try:
            user_ids.append(ObjectId(membership["user_id"]))
        except Exception:
            pass
    
    # Fetch user details
    result = []
    async for user in users.find({"_id": {"$in": user_ids}}):
        result.append(UserResponse(
            id=str(user["_id"]),
            email=user["email"],
            name=user["name"],
            created_at=user["created_at"],
        ))
    
    return result


@router.delete("/{org_id}/members/{user_id}")
async def remove_member(org_id: str, user_id: str):
    """Remove a user from an organization"""
    memberships = get_memberships_collection()
    
    result = await memberships.delete_one({
        "user_id": user_id,
        "organization_id": org_id,
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Membership not found")
    
    return {"message": "Member removed successfully"}


@router.get("/user/{user_id}", response_model=List[OrganizationResponse])
async def list_user_organizations(user_id: str):
    """List all organizations a user belongs to"""
    memberships = get_memberships_collection()
    orgs = get_organizations_collection()
    
    # Get all org IDs for this user
    org_ids = []
    async for membership in memberships.find({"user_id": user_id}):
        try:
            org_ids.append(ObjectId(membership["organization_id"]))
        except Exception:
            pass
    
    # Fetch org details
    result = []
    async for org in orgs.find({"_id": {"$in": org_ids}}):
        result.append(OrganizationResponse(
            id=str(org["_id"]),
            name=org["name"],
            created_by=org["created_by"],
            created_at=org["created_at"],
        ))
    
    return result

