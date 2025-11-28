"""
Document model
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class DocumentBase(BaseModel):
    """Base document fields"""
    original_filename: str


class DocumentCreate(DocumentBase):
    """Fields for creating a document (file is passed separately)"""
    pass


class Document(DocumentBase):
    """Document metadata as stored in MongoDB"""
    id: str = Field(alias="_id")
    case_id: str
    gridfs_file_id: str
    created_by: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        populate_by_name = True


class DocumentResponse(BaseModel):
    """Document response for API"""
    id: str
    case_id: str
    original_filename: str
    created_by: str
    created_at: datetime
    updated_at: datetime
    url: str  # URL to access the document

