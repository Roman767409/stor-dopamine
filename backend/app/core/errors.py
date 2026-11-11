import logging
import uuid
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("app")

REQUEST_ID_HEADER = "X-Request-ID"

STATUS_CODES = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    405: "METHOD_NOT_ALLOWED",
    409: "CONFLICT",
    429: "RATE_LIMITED",
}


# Returns the request id stored by the middleware, or a fresh one as a fallback
def _get_request_id(request: Request) -> str:
    request_id = getattr(request.state, "request_id", None)
    if not request_id:
        request_id = uuid.uuid4().hex
        request.state.request_id = request_id
    return request_id


# Builds a JSON response in the unified {"error": {...}} format
def error_response(
    request: Request,
    status_code: int,
    code: str,
    message: str,
    details: Any = None,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    request_id = _get_request_id(request)
    response_headers = dict(headers or {})
    # Set here too: 500 responses bypass the http middleware
    response_headers[REQUEST_ID_HEADER] = request_id
    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "code": code,
                "message": message,
                "details": details,
                "request_id": request_id,
            }
        },
        headers=response_headers,
    )


# Turns a pydantic error location into a dotted field name without the "body" prefix
def _field_name(loc: Any) -> str:
    parts = [str(part) for part in (loc or ()) if part != "body"]
    return ".".join(parts)


# Removes pydantic's "Value error, " prefix from custom validator messages
def _clean_message(msg: Any) -> str:
    text = str(msg)
    prefix = "Value error, "
    return text[len(prefix):] if text.startswith(prefix) else text


# Wires the request-id middleware and all exception handlers into the app
def register_error_handlers(app: FastAPI) -> None:
    # Assigns a request id to every request and echoes it in the response headers
    @app.middleware("http")
    async def request_id_middleware(request: Request, call_next):
        request_id = uuid.uuid4().hex
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers[REQUEST_ID_HEADER] = request_id
        return response

    # Handles HTTPException from both FastAPI and Starlette (incl. 404/405 routing errors)
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        detail = exc.detail
        if isinstance(detail, dict) and "code" in detail and "message" in detail:
            code = str(detail["code"])
            message = str(detail["message"])
            details = detail.get("details")
        else:
            code = STATUS_CODES.get(exc.status_code, "HTTP_ERROR")
            message = detail if isinstance(detail, str) else "Error"
            details = None
        return error_response(
            request,
            exc.status_code,
            code,
            message,
            details=details,
            headers=getattr(exc, "headers", None),
        )

    # Handles request validation errors with a flat, JSON-safe list of field messages
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        details = [
            {
                "field": _field_name(error.get("loc")),
                "message": _clean_message(error.get("msg", "")),
            }
            for error in exc.errors()
        ]
        return error_response(
            request, 422, "VALIDATION_ERROR", "Validation failed", details=details
        )

    # Catches any unexpected error, logs the traceback and hides internals from the client
    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.exception(
            "Unhandled error (request_id=%s)", _get_request_id(request), exc_info=exc
        )
        return error_response(
            request, 500, "INTERNAL_ERROR", "Internal server error"
        )
