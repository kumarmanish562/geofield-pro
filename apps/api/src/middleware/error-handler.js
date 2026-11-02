export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const status =
    Number.isInteger(error.statusCode) &&
    error.statusCode >= 400 &&
    error.statusCode < 600
      ? error.statusCode
      : Number.isInteger(error.status) &&
          error.status >= 400 &&
          error.status < 600
        ? error.status
      : 500;

  const isProduction = process.env.NODE_ENV === "production";
  const isMalformedJson =
    error instanceof SyntaxError &&
    error.status === 400 &&
    "body" in error;

  req.log?.error(
    {
      err: error,
      requestId: req.id
    },
    "Request failed"
  );

  res.status(status).json({
    success: false,
    error: {
      code:
        error.code ??
        (isMalformedJson
          ? "MALFORMED_JSON"
          : status === 500
            ? "INTERNAL_SERVER_ERROR"
            : "REQUEST_ERROR"),
      message:
        isMalformedJson
          ? "The request body contains malformed JSON."
          : status >= 500 && isProduction
            ? error.publicMessage ?? "An unexpected error occurred."
            : error.message || "An unexpected error occurred."
    },
    requestId: req.id
  });
}