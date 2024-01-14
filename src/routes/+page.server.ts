// import { db } from '$lib/server/db';
// import { movies } from '$lib/schema';
// import { eq } from 'drizzle-orm';

// export async function load() {
// 	return { movies: await db.select().from(movies) };
// }

// export const actions = {
// 	addMovie: async ({ request }) => {
// 		const formData = await request.formData();
// 		const movie = String(formData.get('movie'));
// 		// await db.insert(movies).values({ movie });
// 	},
// 	removeMovie: async ({ url }) => {
// 		const id = +url.searchParams.get('id')!;
// 		await db.delete(movies).where(eq(movies.id, id));
// 	}
// };
