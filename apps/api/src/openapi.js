const openApiDocument = {
  openapi: "3.0.3",

  info: {
    title: "GeoField Pro API",
    version: "0.1.0",
    description:
      "Backend foundation API for the GeoField Pro field workforce platform."
  },

  servers: [
    {
      url: "/",
      description: "Current server"
    }
  ],

  paths: {
    "/api/health": {
      get: {
        summary: "Check API process health",
        responses: {
          "200": {
            description: "API process is responding."
          }
        }
      }
    },

    "/api/ready": {
      get: {
        summary: "Check API readiness",
        responses: {
          "200": {
            description: "Required database dependency is reachable."
          },
          "500": {
            description: "A required dependency is unavailable."
          }
        }
      }
    }
  }
};

export default openApiDocument;