export class TokenLimits {
  maxTokens: number
  requestTokens: number
  responseTokens: number
  knowledgeCutOff: string

  constructor(model = 'gpt-3.5-turbo') {
    this.knowledgeCutOff = '2021-09-01'
    if (model === 'gpt-4-32k') {
      this.maxTokens = 32600
      this.responseTokens = 40
    } else if (model === 'gpt-3o-16k') {
      this.maxTokens = 16300
      this.responseTokens = 3000
    } else if (model === 'gpt-4') {
      this.maxTokens = 8000
      this.responseTokens = 2000
    } else if (model === 'gpt-4o') {
      this.maxTokens = 128000
      this.responseTokens = 4096
    } else if (model === 'gpt-5') {
      this.maxTokens = 200000
      this.responseTokens = 8192
      this.knowledgeCutOff = '2024-04-01'
    } else {
      this.maxTokens = 4000
      this.responseTokens = 1000
    }
    // provide some margin for the request tokens
    this.requestTokens = this.maxTokens - this.responseTokens - 100
  }

  string(): string {
    return `max_tokens=${this.maxTokens}, request_tokens=${this.requestTokens}, response_tokens=${this.responseTokens}`
  }
}
