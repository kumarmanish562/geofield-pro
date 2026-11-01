import pinoHttp from "pino-http";
import { env } from "../config/env.js";

export const requestLogger = pinoHttp({
  level: env.LOG_LEVEL,

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