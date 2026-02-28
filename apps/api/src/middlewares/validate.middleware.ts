import { Request, Response, NextFunction } from "express";
import { z } from "zod";

type ValidationSchema = {
  body?: z.ZodTypeAny;
  query?: z.ZodTypeAny;
  params?: z.ZodTypeAny;
};

export const validate =
  (schema: ValidationSchema) =>
    (req: Request, res: Response, next: NextFunction) => {
      try {
        if (schema.body) {
          const parsed = schema.body.parse(req.body);
          Object.assign(req.body, parsed);
        }

        if (schema.query) {
          const parsed = schema.query.parse(req.query);
          Object.assign(req.query, parsed);
        }

        if (schema.params) {
          const parsed = schema.params.parse(req.params);
          Object.assign(req.params, parsed);
        }

        next();
      } catch (error) {
        if (error instanceof z.ZodError) {
          const errors = error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message
          }));

          return res.status(400).json({ errors });
        }

        next(error);
      }
    };