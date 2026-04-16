declare global {
  namespace App {
    interface Locals {
      preAuth?: { userId: string; sessionToken: string };
    }
  }
}

export {};
