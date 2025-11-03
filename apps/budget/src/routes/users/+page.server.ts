import {superValidate} from 'sveltekit-superforms';
import {zod4} from 'sveltekit-superforms/adapters';
import {fail} from '@sveltejs/kit';
import {formInsertUserSchema} from '$lib/schema/users';
import type {Actions, PageServerLoad} from './$types';
import {users} from '$lib/schema/users';
import {eq, isNull} from 'drizzle-orm';
import {db} from '$lib/server/db';

export const load: PageServerLoad = async () => {
	const form = await superValidate(zod4(formInsertUserSchema));

	// Get all users
	const allUsers = await db
		.select()
		.from(users)
		.where(isNull(users.deletedAt))
		.orderBy(users.displayName);

	return {
		form,
		allUsers
	};
};

export const actions: Actions = {
	create: async ({request, cookies}) => {
		const form = await superValidate(request, zod4(formInsertUserSchema));

		if (!form.valid) {
			return fail(400, {form});
		}

		try {
			// Check if slug already exists
			const existing = await db
				.select()
				.from(users)
				.where(eq(users.slug, form.data.slug))
				.limit(1);

			if (existing.length > 0) {
				return fail(409, {
					form,
					error: 'A workspace with this slug already exists'
				});
			}

			// Create the user
			const [newUser] = await db
				.insert(users)
				.values({
					displayName: form.data.displayName,
					slug: form.data.slug,
					email: form.data.email || null,
					preferences: form.data.preferences || null
				})
				.returning();

			if (!newUser) {
				return fail(500, {
					form,
					error: 'Failed to create workspace'
				});
			}

			// Switch to the new user by setting cookie
			cookies.set('userId', newUser.id.toString(), {
				path: '/',
				maxAge: 60 * 60 * 24 * 365,
				sameSite: 'strict',
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production'
			});

			return {form, success: true, userId: newUser.id};
		} catch (error) {
			console.error('Failed to create user:', error);
			return fail(500, {
				form,
				error: error instanceof Error ? error.message : 'Failed to create workspace'
			});
		}
	},

	switchUser: async ({request, cookies}) => {
		const formData = await request.formData();
		const userId = Number(formData.get('userId'));

		if (!userId || isNaN(userId)) {
			return fail(400, {error: 'Invalid user ID'});
		}

		try {
			// Verify user exists
			const [user] = await db
				.select()
				.from(users)
				.where(eq(users.id, userId))
				.limit(1);

			if (!user) {
				return fail(404, {error: 'User not found'});
			}

			// Set cookie
			cookies.set('userId', userId.toString(), {
				path: '/',
				maxAge: 60 * 60 * 24 * 365,
				sameSite: 'strict',
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production'
			});

			return {success: true, userId};
		} catch (error) {
			console.error('Failed to switch user:', error);
			return fail(500, {
				error: error instanceof Error ? error.message : 'Failed to switch workspace'
			});
		}
	}
};
