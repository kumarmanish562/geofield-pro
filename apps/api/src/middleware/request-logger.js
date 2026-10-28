import pinoHttp from "pino-http";

export const requestLogger = pinoHttp({
  level: process.env.LOG_LEVEL || "info",

  genReqId(req) {
    return req.id;
  },

  customProps(req) {
    return {
      requestId: req.id
    };
  },

  serializers: {
    req(req) {
      return {
        id: req.id,
        method: req.method,
        url: req.url
      };
    }
  }
});