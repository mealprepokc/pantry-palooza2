declare global {
  namespace NodeJS {
    interface ProcessEnv {
      EXPO_PUBLIC_Bolt_Database_URL: string;
      EXPO_PUBLIC_Bolt_Database_ANON_KEY: string;
      OPENAI_API_KEY: string;
    }
  }
}

export {};
