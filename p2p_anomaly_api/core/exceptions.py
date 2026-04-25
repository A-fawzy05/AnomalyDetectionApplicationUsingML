"""
Custom exceptions for the P2P Anomaly Detection API.
"""

from fastapi import HTTPException, status


class P2PError(Exception):
    """Base exception for P2P API"""
    pass


class IngestionError(P2PError):
    """Raised when data ingestion fails"""
    pass


class UnsupportedFileTypeError(P2PError):
    """Raised when the uploaded file type is not supported"""
    pass


class InvalidOCEL2SchemaError(IngestionError):
    """Raised when OCEL 2.0 schema validation fails"""
    pass


class ModelNotLoadedError(P2PError):
    """Raised when ML models are not loaded"""
    pass


class FileTooLargeError(P2PError):
    """Raised when the uploaded file exceeds size limits"""
    pass


class DatabaseError(P2PError):
    """Raised when a database operation fails"""
    pass
