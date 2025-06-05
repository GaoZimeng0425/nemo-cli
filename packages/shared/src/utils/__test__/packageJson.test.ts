import * as fs from "node:fs/promises";
import * as path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { log } from "../log.js"; // Relative to this file's new location
import { getPackageDependencies } from "../packageJson.js"; // Relative to this file's new location

// Mock modules
vi.mock("fs/promises");
vi.mock("../log"); // Mock log relative to this file's new location

describe("getPackageDependencies", () => {
	const mockLog = {
		info: vi.fn(),
		error: vi.fn(),
	};

	beforeEach(() => {
		vi.resetAllMocks();
		// @ts-ignore
		log.info = mockLog.info;
		// @ts-ignore
		log.error = mockLog.error;
	});

	const mockPackageDir = "/test/package";

	it("should return both dependencies and devDependencies", async () => {
		const mockPackageJsonContent = JSON.stringify({
			dependencies: {
				react: "^18.0.0",
			},
			devDependencies: {
				vitest: "^0.25.0",
			},
		});
		vi.spyOn(fs, "readFile").mockResolvedValue(mockPackageJsonContent);

		const dependencies = await getPackageDependencies(mockPackageDir);
		expect(dependencies).toEqual(
			expect.arrayContaining([
				{ name: "react", version: "^18.0.0", type: "dependencies" },
				{ name: "vitest", version: "^0.25.0", type: "devDependencies" },
			]),
		);
		expect(dependencies.length).toBe(2);
		expect(mockLog.info).toHaveBeenCalledWith(
			`Reading package.json from: ${path.join(mockPackageDir, "package.json")}`,
		);
	});

	it("should return only dependencies if devDependencies are missing", async () => {
		const mockPackageJsonContent = JSON.stringify({
			dependencies: {
				lodash: "^4.17.21",
			},
		});
		vi.spyOn(fs, "readFile").mockResolvedValue(mockPackageJsonContent);

		const dependencies = await getPackageDependencies(mockPackageDir);
		expect(dependencies).toEqual([
			{ name: "lodash", version: "^4.17.21", type: "dependencies" },
		]);
	});

	it("should return only devDependencies if dependencies are missing", async () => {
		const mockPackageJsonContent = JSON.stringify({
			devDependencies: {
				eslint: "^8.0.0",
			},
		});
		vi.spyOn(fs, "readFile").mockResolvedValue(mockPackageJsonContent);

		const dependencies = await getPackageDependencies(mockPackageDir);
		expect(dependencies).toEqual([
			{ name: "eslint", version: "^8.0.0", type: "devDependencies" },
		]);
	});

	it("should return an empty array if no dependencies are present", async () => {
		const mockPackageJsonContent = JSON.stringify({});
		vi.spyOn(fs, "readFile").mockResolvedValue(mockPackageJsonContent);

		const dependencies = await getPackageDependencies(mockPackageDir);
		expect(dependencies).toEqual([]);
	});

	it("should return an empty array and log error if package.json is not found", async () => {
		const fileNotFoundError = new Error(
			"File not found",
		) as NodeJS.ErrnoException;
		fileNotFoundError.code = "ENOENT";
		vi.spyOn(fs, "readFile").mockRejectedValue(fileNotFoundError);

		const dependencies = await getPackageDependencies(mockPackageDir);
		expect(dependencies).toEqual([]);
		expect(mockLog.error).toHaveBeenCalledWith(
			`package.json not found at ${path.join(mockPackageDir, "package.json")}`,
		);
	});

	it("should return an empty array and log error if package.json is malformed", async () => {
		const malformedJson = '{"dependencies": { "broken": "1.0.0", }'; // Trailing comma
		vi.spyOn(fs, "readFile").mockResolvedValue(malformedJson);

		const dependencies = await getPackageDependencies(mockPackageDir);
		expect(dependencies).toEqual([]);
		expect(mockLog.error).toHaveBeenCalledWith(
			expect.stringContaining(
				`Failed to read or parse package.json at ${path.join(mockPackageDir, "package.json")}`,
			),
		);
	});

	it("should return an empty array and log error for other read errors", async () => {
		const genericError = new Error("Read permission denied");
		vi.spyOn(fs, "readFile").mockRejectedValue(genericError);

		const dependencies = await getPackageDependencies(mockPackageDir);
		expect(dependencies).toEqual([]);
		expect(mockLog.error).toHaveBeenCalledWith(
			`Failed to read or parse package.json at ${path.join(mockPackageDir, "package.json")}: Read permission denied`,
		);
	});
});
