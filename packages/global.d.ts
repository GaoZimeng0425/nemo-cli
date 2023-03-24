/// <reference path="./shared/types/index.d.ts" />

export declare global {
  interface GlobalThis {
    aaa: string
  }
  declare interface Window {
    wx: number
    /**
     * @override
     */
    document: Document & never
  }

  declare interface String {
    /**
     * @deprecated Please use String.prototype.slice instead of String.prototype.substring in the repository.
     */
    substring(start: number, end?: number): string
  }
}
