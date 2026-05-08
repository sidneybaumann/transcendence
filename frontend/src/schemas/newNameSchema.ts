import * as z from "zod";

export const newNameSchema = z.object({
  name: z.string().trim().min(1, "A username is required.").max(30, "Name cannot be more than 30 characters long."),
});
