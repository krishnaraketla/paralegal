"""
Users router - basic CRUD operations
"""
from datetime import datetime
from typing import List
from bson import ObjectId
from fastapi import APIRouter, HTTPException

from app.database import get_users_collection
from app.models.user import UserCreate, UserResponse

router = APIRouter()


@router.post("", response_model=UserResponse)
async def create_user(user: UserCreate):
    """Create a new user"""
    users = get_users_collection()
    
    # Check if email already exists
    existing = await users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_doc = {
        "email": user.email,
        "name": user.name,
        "created_at": datetime.utcnow(),
    }
    
    result = await users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id
    
    return UserResponse(
        id=str(user_doc["_id"]),
        email=user_doc["email"],
        name=user_doc["name"],
        created_at=user_doc["created_at"],
    )


@router.get("", response_model=List[UserResponse])
async def list_users():
    """List all users"""
    users = get_users_collection()
    
    result = []
    async for user in users.find():
        result.append(UserResponse(
            id=str(user["_id"]),
            email=user["email"],
            name=user["name"],
            created_at=user["created_at"],
        ))
    
    return result


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str):
    """Get a user by ID"""
    users = get_users_collection()
    
    try:
        user = await users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(
        id=str(user["_id"]),
        email=user["email"],
        name=user["name"],
        created_at=user["created_at"],
    )


@router.delete("/{user_id}")
async def delete_user(user_id: str):
    """Delete a user"""
    users = get_users_collection()
    
    try:
        result = await users.delete_one({"_id": ObjectId(user_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted successfully"}

