"""
Case model
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class CaseBase(BaseModel):
    """Base case fields"""
    name: str
    description: Optional[str] = None


class CaseCreate(CaseBase):
    """Fields for creating a case"""
    pass


class Case(CaseBase):
    """Case document as stored in MongoDB"""
    id: str = Field(alias="_id")
    organization_id: str
    created_by: str
    created_at: datetime
    
    class Config:
        populate_by_name = True


class CaseResponse(BaseModel):
    """Case response for API"""
    id: str
    organization_id: str
    name: str
    description: Optional[str] = None
    created_by: str
    created_at: datetime

