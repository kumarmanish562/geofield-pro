export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const status =
    Number.isInteger(error.status) &&
    error.status >= 400 &&
    error.status < 500
      ? error.status
      : 500;

  const isProduction = process.env.NODE_ENV === "production";

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
      code: status === 500 ? "INTERNAL_SERVER_ERROR" : "REQUEST_ERROR",
      message:
        status === 500 && isProduction
          ? "An unexpected error occurred."
          : error.message || "An unexpected error occurred."
    },
    requestId: req.id
  });
}