import { Controller, Get, Res } from "@nestjs/common";
import type { Response } from "express";

@Controller()
export class AppController {
  @Get()
  home(@Res() res: Response) {
    res.type("html").send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TangoMove App</title>
  <style>
    body {
      margin: 0;
      font-family: Arial, sans-serif;
      background: #f3f6fb;
      color: #0f172a;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .card {
      background: #ffffff;
      width: 100%;
      max-width: 640px;
      padding: 42px;
      border-radius: 24px;
      box-shadow: 0 20px 55px rgba(15, 23, 42, 0.12);
      text-align: center;
    }

    h1 {
      font-size: 48px;
      margin: 0 0 12px;
    }

    p {
      color: #64748b;
      font-size: 20px;
      line-height: 1.5;
      margin-bottom: 30px;
    }

    .buttons {
      display: grid;
      gap: 14px;
    }

    a {
      display: block;
      text-decoration: none;
      padding: 18px 20px;
      border-radius: 14px;
      font-size: 20px;
      font-weight: 800;
      background: #3264f5;
      color: #ffffff;
    }

    a.secondary {
      background: #0f172a;
    }

    a.admin {
      background: #16a34a;
    }

    .note {
      margin-top: 26px;
      font-size: 14px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <main class="card">
    <h1>TangoMove</h1>
    <p>Choose your portal to continue.</p>

    <div class="buttons">
      <a href="/rider/login.html">Book a Ride</a>
      <a href="/driver/login.html" class="secondary">Driver Login</a>
      <a href="/admin/login.html" class="admin">Admin Login</a>
    </div>

    <div class="note">
    TangoMove app portal
    </div>
  </main>
</body>
</html>
    `);
  }
}
