import type { RequestHandler } from "@sveltejs/kit";
import { router } from "./router";
import { createContext } from "./context";

export const orpcHandler: RequestHandler = async ({ request, url }) => {
  const context = await createContext();
  
  // Extract the procedure path from the URL
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const procedurePath = pathSegments.slice(2); // Remove 'api' and 'orpc' segments
  
  try {
    // Navigate to the procedure
    let procedure: any = router;
    for (const segment of procedurePath) {
      procedure = procedure[segment];
      if (!procedure) {
        return new Response(JSON.stringify({ error: "Procedure not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // Parse input for POST requests
    let input: any = undefined;
    if (request.method === "POST") {
      const body = await request.text();
      if (body) {
        input = JSON.parse(body);
      }
    } else if (request.method === "GET") {
      // Parse query parameters for GET requests
      const searchParams = url.searchParams;
      if (searchParams.has('input')) {
        input = JSON.parse(searchParams.get('input') || '{}');
      }
    }

    // Execute the procedure
    const result = await procedure.func({ input, context });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error: any) {
    const status = error.code === "NOT_FOUND" ? 404 : 
                   error.code === "BAD_REQUEST" ? 400 : 
                   error.code === "INTERNAL_SERVER_ERROR" ? 500 : 400;

    return new Response(JSON.stringify({ 
      error: error.message || "Internal server error" 
    }), {
      status,
      headers: { "Content-Type": "application/json" }
    });
  }
};