
   
import json
import logging
import traceback
from datetime import datetime, timezone

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler

class JsonFormatter(logging.Formatter):

    def format(self, record: logging.LogRecord) -> str:                          
        log_data = {
            "timestamp": datetime.now(tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
            "message": record.getMessage(),
        }
        if record.exc_info:
            log_data["exception"] = traceback.format_exception(*record.exc_info)
        return json.dumps(log_data)

def custom_exception_handler(exc: Exception, context: dict) -> Response:
                                                                 
    response = exception_handler(exc, context)

    if response is not None:
        data = response.data
        code = getattr(exc, "default_code", "ERROR").upper()
        detail = ""
        if isinstance(data, dict) and "detail" in data:
            detail = str(data["detail"])
            code = getattr(getattr(exc, "detail", None), "code", code) or code
            code = code.upper()
        elif isinstance(data, list):
            detail = "; ".join(str(item) for item in data)
        else:
            detail = str(data)

        response.data = {
            "error": code,
            "message": detail,
            "status": response.status_code,
        }

    return response

def error_response(
    error_code: str,
    message: str,
    http_status: int = status.HTTP_400_BAD_REQUEST,
) -> Response:
                                                                          
    return Response(
        {"error": error_code, "message": message, "status": http_status},
        status=http_status,
    )
