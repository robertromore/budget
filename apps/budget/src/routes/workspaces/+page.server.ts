import { superValidate } from "sveltekit-superforms";
import { zod4 } from "sveltekit-superforms/adapters";
import { fail } from "@sveltejs/kit";
import { formInsertWorkspaceSchema } from "$lib/schema/workspaces";
import type { Actions, PageServerLoad } from "./$types";
import { workspaces } from "$lib/schema/workspaces";
import { eq, isNull } from "drizzle-orm";
import { db } from "$lib/server/db";

export const load: PageServerLoad = async () => {
  const form = await superValidate(zod4(formInsertWorkspaceSchema));

  // Get all workspaces
  const allWorkspaces = await db
    .select()
    .from(workspaces)
    .where(isNull(workspaces.deletedAt))
    .orderBy(workspaces.displayName);

  return {
    form,
    allWorkspaces,
  };
};

export const actions: Actions = {
  create: async ({ request, cookies }) => {
    const form = await superValidate(request, zod4(formInsertWorkspaceSchema));

    if (!form.valid) {
      return fail(400, { form });
    }

    try {
      // Check if slug already exists
      const existing = await db
        .select()
        .from(workspaces)
        .where(eq(workspaces.slug, form.data.slug))
        .limit(1);

      if (existing.length > 0) {
        return fail(409, {
          form,
          error: "A workspace with this slug already exists",
        });
      }

      // Create the workspace
      const [newWorkspace] = await db
        .insert(workspaces)
        .values({
          displayName: form.data.displayName,
          slug: form.data.slug,
          preferences: form.data.preferences || null,
        })
        .returning();

      if (!newWorkspace) {
        return fail(500, {
          form,
          error: "Failed to create workspace",
        });
      }

      // Switch to the new workspace by setting cookie
      cookies.set("userId", newWorkspace.id.toString(), {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "strict",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
      });

      return { form, success: true, workspaceId: newWorkspace.id };
    } catch (error) {
      console.error("Failed to create workspace:", error);
      return fail(500, {
        form,
        error: error instanceof Error ? error.message : "Failed to create workspace",
      });
    }
  },

  switchWorkspace: async ({ request, cookies }) => {
    const formData = await request.formData();
    const workspaceId = Number(formData.get("workspaceId"));

    if (!workspaceId || isNaN(workspaceId)) {
      return fail(400, { error: "Invalid workspace ID" });
    }

    try {
      // Verify workspace exists
      const [workspace] = await db
        .select()
        .from(workspaces)
        .where(eq(workspaces.id, workspaceId))
        .limit(1);

      if (!workspace) {
        return fail(404, { error: "Workspace not found" });
      }

      // Set cookie
      cookies.set("userId", workspaceId.toString(), {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "strict",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
      });

      return { success: true, workspaceId };
    } catch (error) {
      console.error("Failed to switch workspace:", error);
      return fail(500, {
        error: error instanceof Error ? error.message : "Failed to switch workspace",
      });
    }
  },
};
