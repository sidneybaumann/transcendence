import type { ZodError } from "zod";

export const mapZodErrors = (error: ZodError): Record<string, string[]> => {
  const errors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const field = issue.path[0];

    if (typeof field === "string") {
      if (!errors[field]) errors[field] = [];
      errors[field].push(issue.message);
    }
  }

  return errors;
};
