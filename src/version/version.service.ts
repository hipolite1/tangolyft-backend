import { Injectable } from "@nestjs/common";

@Injectable()
export class VersionService {
  get() {
    const commit =
      process.env.RENDER_GIT_COMMIT ||
      process.env.COMMIT_SHA ||
      process.env.GIT_COMMIT ||
      "unknown";

    return {
      ok: true,
      service: "tangolyft-backend",
      commit,
      ts: new Date().toISOString(),
    };
  }
}

