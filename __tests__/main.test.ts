import {expect, test} from '@jest/globals'

// Integration test to verify the built distribution package contains GPT-5 support
test('dist package contains GPT-5 implementation', () => {
  const fs = require('fs')
  const path = require('path')
  
  // Check that dist/index.js exists (the packaged bundle)
  const distPath = path.join(__dirname, '..', 'dist', 'index.js')
  expect(fs.existsSync(distPath)).toBe(true)
  
  // Verify it contains our GPT-5 implementation
  const distContent = fs.readFileSync(distPath, 'utf8')
  expect(distContent.length).toBeGreaterThan(1000)
  
  // Verify GPT-5 specific implementations are present
  expect(distContent).toContain('gpt-5') // Model name
  expect(distContent).toContain('200000') // Max tokens
  expect(distContent).toContain('8192')   // Response tokens
  expect(distContent).toContain('2024-04-01') // Knowledge cutoff
})

test('package.json configuration is correct', () => {
  const fs = require('fs')
  const path = require('path')
  
  const packagePath = path.join(__dirname, '..', 'package.json')
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
  
  // Verify package structure
  expect(packageJson.name).toBe('openai-pr-reviewer')
  expect(packageJson.main).toBe('lib/main.js')
  expect(packageJson.scripts.build).toBeDefined()
  expect(packageJson.scripts.test).toBe('jest')
})

test('action.yml contains GPT-5 documentation', () => {
  const fs = require('fs')
  const path = require('path')
  
  const actionPath = path.join(__dirname, '..', 'action.yml')
  const actionContent = fs.readFileSync(actionPath, 'utf8')
  
  // Verify GPT-5 is documented in action.yml
  expect(actionContent).toContain('gpt-5')
  expect(actionContent).toContain('Supported models')
})
