import { VersionService } from "./version.service";
export declare class VersionController {
    private readonly version;
    constructor(version: VersionService);
    getVersion(): {
        ok: boolean;
        service: string;
        commit: string;
        ts: string;
    };
}
