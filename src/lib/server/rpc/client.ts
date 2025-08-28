// Create a simple client function that can make requests to our oRPC endpoints
export class ORPCClient {
  constructor(private baseURL: string = "/api/orpc") {}

  private async request(path: string[], input?: any, method: "GET" | "POST" = "GET") {
    const url = `${this.baseURL}/${path.join("/")}`;

    const fetchOptions: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (method === "GET" && input) {
      const searchParams = new URLSearchParams();
      searchParams.set("input", JSON.stringify(input));
      const fullUrl = `${url}?${searchParams.toString()}`;
      const response = await fetch(fullUrl, fetchOptions);
      return response.json();
    } else if (method === "POST") {
      fetchOptions.body = JSON.stringify(input);
      const response = await fetch(url, fetchOptions);
      return response.json();
    } else {
      const response = await fetch(url, fetchOptions);
      return response.json();
    }
  }

  // Account procedures
  accounts = {
    all: () => this.request(["accounts", "all"]),
    load: (input: { id: number }) => this.request(["accounts", "load"], input, "GET"),
    save: (input: any) => this.request(["accounts", "save"], input, "POST"),
    remove: (input: { id: number }) => this.request(["accounts", "remove"], input, "POST"),
  };

  // Category procedures
  categories = {
    all: () => this.request(["categories", "all"]),
    load: (input: { id: number }) => this.request(["categories", "load"], input, "GET"),
    save: (input: any) => this.request(["categories", "save"], input, "POST"),
    remove: (input: { id: number }) => this.request(["categories", "remove"], input, "POST"),
    delete: (input: { entities: number[] }) =>
      this.request(["categories", "delete"], input, "POST"),
  };

  // Payee procedures
  payees = {
    all: () => this.request(["payees", "all"]),
    load: (input: { id: number }) => this.request(["payees", "load"], input, "GET"),
    save: (input: any) => this.request(["payees", "save"], input, "POST"),
    remove: (input: { id: number }) => this.request(["payees", "remove"], input, "POST"),
    delete: (input: { entities: number[] }) => this.request(["payees", "delete"], input, "POST"),
  };

  // Transaction procedures
  transactions = {
    forAccount: (input: { id: number }) =>
      this.request(["transactions", "forAccount"], input, "GET"),
    save: (input: any) => this.request(["transactions", "save"], input, "POST"),
    delete: (input: { entities: number[] }) =>
      this.request(["transactions", "delete"], input, "POST"),
  };

  // Schedule procedures
  schedules = {
    all: () => this.request(["schedules", "all"]),
    load: (input: { id: number }) => this.request(["schedules", "load"], input, "GET"),
    save: (input: any) => this.request(["schedules", "save"], input, "POST"),
    remove: (input: { id: number }) => this.request(["schedules", "remove"], input, "POST"),
  };

  // View procedures
  views = {
    all: () => this.request(["views", "all"]),
    load: (input: { id: number }) => this.request(["views", "load"], input, "GET"),
    save: (input: any) => this.request(["views", "save"], input, "POST"),
    remove: (input: { id: number }) => this.request(["views", "remove"], input, "POST"),
    delete: (input: { entities: number[] }) => this.request(["views", "delete"], input, "POST"),
  };
}

export const orpcClient = new ORPCClient();
