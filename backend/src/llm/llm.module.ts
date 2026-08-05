import { Module } from '@nestjs/common';
import { LlmProvider } from '../agent/llm-provider';
import { OllamaProvider } from './ollama.provider';

@Module({
  providers: [{ provide: LlmProvider, useClass: OllamaProvider }],
  exports: [LlmProvider],
})
export class LlmModule {}
