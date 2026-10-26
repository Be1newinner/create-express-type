import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "@/app.js";

const product = { name: "Widget", description: "A useful widget", price: 9.99, stock: 5 };

describe("products", () => {
  it("lists the seeded products", async () => {
    const res = await request(app).get("/api/v1/products");

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it("gets a product by ID", async () => {
    const res = await request(app).get("/api/v1/products/1");

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe("1");
  });

  it("returns 404 for an unknown product", async () => {
    const res = await request(app).get("/api/v1/products/unknown");

    expect(res.status).toBe(404);
  });

  it("requires authentication to create a product", async () => {
    const res = await request(app).post("/api/v1/products").send(product);

    expect(res.status).toBe(401);
  });

  it("forbids non-admin users from creating products", async () => {
    const register = await request(app)
      .post("/api/v1/auth/register")
      .send({ name: "Regular User", email: "user@example.com", password: "password123" });

    const res = await request(app)
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${register.body.data.token}`)
      .send(product);

    expect(res.status).toBe(403);
  });
});
