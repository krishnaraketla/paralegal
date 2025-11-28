"""
Cases router - CRUD operations scoped to organizations
"""
from datetime import datetime
from typing import List
from bson import ObjectId
from fastapi import APIRouter, HTTPException

from app.database import (
    get_cases_collection,
    get_organizations_collection,
    get_users_collection,
)
from app.models.case import CaseCreate, CaseResponse

router = APIRouter()


@router.post("", response_model=CaseResponse)
async def create_case(org_id: str, case: CaseCreate, created_by: str):
    """Create a new case in an organization"""
    cases = get_cases_collection()
    orgs = get_organizations_collection()
    users = get_users_collection()
    
    # Verify org exists
    try:
        org = await orgs.find_one({"_id": ObjectId(org_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid organization ID")
    
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # Verify user exists
    try:
        user = await users.find_one({"_id": ObjectId(created_by)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    case_doc = {
        "organization_id": org_id,
        "name": case.name,
        "description": case.description,
        "created_by": created_by,
        "created_at": datetime.utcnow(),
    }
    
    result = await cases.insert_one(case_doc)
    
    return CaseResponse(
        id=str(result.inserted_id),
        organization_id=case_doc["organization_id"],
        name=case_doc["name"],
        description=case_doc["description"],
        created_by=case_doc["created_by"],
        created_at=case_doc["created_at"],
    )


@router.get("", response_model=List[CaseResponse])
async def list_cases(org_id: str):
    """List all cases in an organization"""
    cases = get_cases_collection()
    orgs = get_organizations_collection()
    
    # Verify org exists
    try:
        org = await orgs.find_one({"_id": ObjectId(org_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid organization ID")
    
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    result = []
    async for case in cases.find({"organization_id": org_id}):
        result.append(CaseResponse(
            id=str(case["_id"]),
            organization_id=case["organization_id"],
            name=case["name"],
            description=case.get("description"),
            created_by=case["created_by"],
            created_at=case["created_at"],
        ))
    
    return result


@router.get("/{case_id}", response_model=CaseResponse)
async def get_case(case_id: str):
    """Get a case by ID"""
    cases = get_cases_collection()
    
    try:
        case = await cases.find_one({"_id": ObjectId(case_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid case ID")
    
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    return CaseResponse(
        id=str(case["_id"]),
        organization_id=case["organization_id"],
        name=case["name"],
        description=case.get("description"),
        created_by=case["created_by"],
        created_at=case["created_at"],
    )


@router.put("/{case_id}", response_model=CaseResponse)
async def update_case(case_id: str, case_update: CaseCreate):
    """Update a case"""
    cases = get_cases_collection()
    
    try:
        result = await cases.find_one_and_update(
            {"_id": ObjectId(case_id)},
            {"$set": {
                "name": case_update.name,
                "description": case_update.description,
            }},
            return_document=True,
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid case ID")
    
    if not result:
        raise HTTPException(status_code=404, detail="Case not found")
    
    return CaseResponse(
        id=str(result["_id"]),
        organization_id=result["organization_id"],
        name=result["name"],
        description=result.get("description"),
        created_by=result["created_by"],
        created_at=result["created_at"],
    )


@router.delete("/{case_id}")
async def delete_case(case_id: str):
    """Delete a case"""
    cases = get_cases_collection()
    
    try:
        result = await cases.delete_one({"_id": ObjectId(case_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid case ID")
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Case not found")
    
    return {"message": "Case deleted successfully"}

