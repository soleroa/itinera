export interface JsonSchemaObject {
  type: 'object';
  properties: Record<string, unknown>;
  required?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: JsonSchemaObject;
}

export interface Tool<TInput = unknown, TOutput = unknown>
  extends ToolDefinition {
  execute(input: TInput): Promise<TOutput>;
}
