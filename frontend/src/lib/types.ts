export interface MCPServerConfig {
  id: string
  displayName: string
  command: string
  args: string[]
  cwd?: string
  userArgs?: boolean
  env?: Record<string, string>
  summary: string
}
