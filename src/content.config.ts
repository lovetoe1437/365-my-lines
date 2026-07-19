import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const lines = defineCollection({
	loader: glob({
		pattern: "**/*.md",
		base: "./src/data/lines",
	}),

	schema: z.object({
		number: z.number(),
		date: z.coerce.date(),
		title: z.string().optional(),
		photo: z.string().optional(),
	}),
});

export const collections = {
	lines,
};