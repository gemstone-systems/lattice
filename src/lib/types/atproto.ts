import { z } from "zod";

export const didPlcSchema = z.templateLiteral(["did:plc:", z.string()]);

export type DidPlc = z.infer<typeof didPlcSchema>;
