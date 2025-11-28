"""
User model
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, EmailStr


class UserBase(BaseModel):
    """Base user fields"""
    email: EmailStr
    name: str


class UserCreate(UserBase):
    """Fields for creating a user"""
    pass


class User(UserBase):
    """User document as stored in MongoDB"""
    id: str = Field(alias="_id")
    created_at: datetime
    
    class Config:
        populate_by_name = True


class UserResponse(BaseModel):
    """User response for API"""
    id: str
    email: str
    name: str
    created_at: datetime

