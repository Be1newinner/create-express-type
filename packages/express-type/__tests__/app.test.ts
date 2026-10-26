import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "@/app.js";

describe("app", () => {
  it("GET /health reports ok", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.headers["x-request-id"]).toBeDefined();
  });

  it("returns a JSON 404 for unknown routes", async () => {
    const res = await request(app).get("/does-not-exist");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, message: "Cannot GET /does-not-exist" });
  });

  it("returns 400 (not 500) for malformed JSON", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .set("Content-Type", "application/json")
      .send("{bad json");

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns 413 for bodies over the 10kb limit", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ padding: "a".repeat(20_000) });

    expect(res.status).toBe(413);
  });

  it("serves the OpenAPI document with every route", async () => {
    const res = await request(app).get("/docs/openapi.json");

    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe("3.0.3");
    expect(Object.keys(res.body.paths)).toEqual(
      expect.arrayContaining(["/health", "/api/v1/auth/register", "/api/v1/products/{id}"])
    );
  });

  it("serves Swagger UI at /docs", async () => {
    const res = await request(app).get("/docs/");

    expect(res.status).toBe(200);
    expect(res.text).toContain("swagger-ui");
  });
});
