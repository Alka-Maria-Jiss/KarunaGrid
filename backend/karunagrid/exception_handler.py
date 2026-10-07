import logging
import traceback
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    # Call REST framework's default exception handler first to get the standard error response
    response = exception_handler(exc, context)

    # If response is None, this is an unhandled exception (which would normally trigger a 500 HTML page)
    if response is None:
        logger.error(f"[Unhandled API Exception] {exc} in {context.get('view')}", exc_info=True)
        return Response(
            {
                "detail": "An internal server error occurred.",
                "error_message": str(exc),
                "error_type": exc.__class__.__name__,
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return response
