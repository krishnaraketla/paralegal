"""
Organization model
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class OrganizationBase(BaseModel):
    """Base organization fields"""
    name: str


class OrganizationCreate(OrganizationBase):
    """Fields for creating an organization"""
    pass


class Organization(OrganizationBase):
    """Organization document as stored in MongoDB"""
    id: str = Field(alias="_id")
    created_by: str
    created_at: datetime
    
    class Config:
        populate_by_name = True


class OrganizationResponse(BaseModel):
    """Organization response for API"""
    id: str
    name: str
    created_by: str
    created_at: datetime

