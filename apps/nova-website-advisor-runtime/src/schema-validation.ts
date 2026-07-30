import { createRequire } from "node:module";
import type { ErrorObject, ValidateFunction } from "ajv";
import type { ModelProposal } from "./domain.js";

const require = createRequire(import.meta.url);
type AjvInstance = {
  compile<T>(schema: object): ValidateFunction<T>;
};
type AjvConstructor = new (options: {
  allErrors: boolean;
  strict: boolean;
}) => AjvInstance;
const Ajv2020 = require("ajv/dist/2020").default as AjvConstructor;
const addFormats = require("ajv-formats").default as (
  ajv: AjvInstance,
) => AjvInstance;

export class ContractValidationError extends Error {
  readonly errors: ErrorObject[];

  constructor(errors: ErrorObject[]) {
    super("Model proposal failed contract validation");
    this.name = "ContractValidationError";
    this.errors = errors;
  }
}

export function createModelProposalValidator(
  schema: object,
): (value: unknown) => ModelProposal {
  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
  });
  addFormats(ajv);
  const validate: ValidateFunction<ModelProposal> = ajv.compile(schema);

  return (value: unknown): ModelProposal => {
    if (!validate(value)) {
      throw new ContractValidationError(validate.errors ?? []);
    }
    return value;
  };
}
