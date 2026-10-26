import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "@/app.js";

const user = { name: "Ada Lovelace", email: "Ada@Example.com", password: "correct-horse-battery" };

describe("auth", () => {
  it("registers a user and returns a token without the password", async () => {
    const res = await request(app).post("/api/v1/auth/register").send(user);

    expect(res.status).toBe(201);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user.email).toBe("ada@example.com");
    expect(res.body.data.user.password).toBeUndefined();
  });

  it("rejects a duplicate email with 409", async () => {
    const res = await request(app).post("/api/v1/auth/register").send(user);

    expect(res.status).toBe(409);
  });

  it("reports every invalid field at once", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ name: "A", email: "not-an-email" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Validation failed");
    expect(res.body.errors.map((e: { path: string }) => e.path)).toEqual([
      "body.name",
      "body.email",
      "body.password",
    ]);
  });

  it("logs in and fetches the profile with the token", async () => {
    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: user.email, password: user.password });
    expect(login.status).toBe(200);

    const profile = await request(app)
      .get("/api/v1/auth/profile")
      .set("Authorization", `Bearer ${login.body.data.token}`);

    expect(profile.status).toBe(200);
    expect(profile.body.data.name).toBe(user.name);
  });

  it("rejects a wrong password with 401", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: user.email, password: "wrong-password" });

    expect(res.status).toBe(401);
  });

  it("rejects the profile route without a token", async () => {
    const res = await request(app).get("/api/v1/auth/profile");

    expect(res.status).toBe(401);
  });
});
