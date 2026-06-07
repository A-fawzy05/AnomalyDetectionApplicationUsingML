

from fastapi import HTTPException, status

class P2PError(Exception):
                                    
    pass

class IngestionError(P2PError):
                                          
    pass

class UnsupportedFileTypeError(P2PError):
                                                             
    pass

class InvalidOCEL2SchemaError(IngestionError):
                                                      
    pass

class ModelNotLoadedError(P2PError):
                                              
    pass

class FileTooLargeError(P2PError):
                                                           
    pass

class DatabaseError(P2PError):
                                                
    pass

