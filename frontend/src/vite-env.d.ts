/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_STAFF_TOKEN?: string
  readonly VITE_PLATFORM_PASSCODE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

